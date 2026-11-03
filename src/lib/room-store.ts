import {
  Bet,
  ChatMessage,
  DiceResult,
  PlaceBetRequest,
  Player,
  PlayerSettlement,
  Room,
  RoomSummary,
  Round,
  SymbolId,
} from '@/types';
import {
  LedgerManager,
  assertCanBet,
  rollDice,
  settleRound,
  summarizeBoardBets,
} from '@/engine';

export type SSEListener = (data: { event: string; payload: any }) => void;

class VercelRoomStore {
  private rooms = new Map<string, Room>();
  private roomsByCode = new Map<string, string>(); // code -> id
  private roomBets = new Map<string, Bet[]>(); // roundId -> Bet[]
  private ledger = new LedgerManager();
  private sseListeners = new Map<string, Set<SSEListener>>(); // roomId -> Set<listener>
  private chatMessages = new Map<string, ChatMessage[]>(); // roomId -> ChatMessage[]

  public getLedger(): LedgerManager {
    return this.ledger;
  }

  public registerPlayer(
    deviceId: string,
    nickname: string,
    avatarId: string
  ): Player {
    const existingBalance = this.ledger.getBalance(deviceId);
    const player: Player = {
      id: 'p_' + deviceId,
      nickname: nickname.trim().slice(0, 20) || 'Người Chơi',
      avatarId,
      points: existingBalance,
      deviceId,
      isReady: false,
      isHost: false,
      connected: true,
      joinedAt: Date.now(),
      lastActiveAt: Date.now(),
    };
    return player;
  }

  public generateRoomCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return this.roomsByCode.has(code) ? this.generateRoomCode() : code;
  }

  public createRoom(
    creator: Player,
    options: {
      name: string;
      isPrivate: boolean;
      passcode?: string;
      maxPlayers?: number;
      betDurationSeconds?: number;
    }
  ): Room {
    const roomId = 'room_' + crypto.randomUUID().slice(0, 8);
    const code = this.generateRoomCode();
    const roundId = 'rnd_' + crypto.randomUUID().slice(0, 8);

    const initialRound: Round = {
      id: roundId,
      roomId,
      roundNumber: 1,
      state: 'WAITING',
      startedAt: Date.now(),
      totalBetsAmount: 0,
    };

    creator.isHost = true;
    creator.isReady = true;

    const room: Room = {
      id: roomId,
      code,
      name: options.name.trim().slice(0, 40) || 'Bầu Cua Tết Giáp Thìn',
      hostId: creator.id,
      isPrivate: options.isPrivate,
      passcode: options.passcode,
      maxPlayers: Math.min(Math.max(options.maxPlayers || 30, 2), 30),
      players: { [creator.id]: { ...creator } },
      currentRound: initialRound,
      roundHistory: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.rooms.set(roomId, room);
    this.roomsByCode.set(code, roomId);
    this.roomBets.set(roundId, []);
    this.chatMessages.set(roomId, []);

    return room;
  }

  public getRoom(roomIdOrCode: string): Room | undefined {
    let room = this.rooms.get(roomIdOrCode);
    if (!room) {
      const id = this.roomsByCode.get(roomIdOrCode.toUpperCase());
      if (id) room = this.rooms.get(id);
    }
    return room;
  }

  public listPublicRooms(): RoomSummary[] {
    const summaries: RoomSummary[] = [];
    for (const room of this.rooms.values()) {
      if (!room.isPrivate) {
        const host = room.players[room.hostId];
        summaries.push({
          id: room.id,
          code: room.code,
          name: room.name,
          hostNickname: host ? host.nickname : 'Host',
          isPrivate: room.isPrivate,
          playerCount: Object.keys(room.players).length,
          maxPlayers: room.maxPlayers,
          status: room.currentRound.state,
          createdAt: room.createdAt,
        });
      }
    }
    return summaries.sort((a, b) => b.createdAt - a.createdAt);
  }

  public joinRoom(
    player: Player,
    roomIdOrCode: string,
    passcode?: string
  ): { success: boolean; room?: Room; error?: string } {
    const room = this.getRoom(roomIdOrCode);
    if (!room) {
      return { success: false, error: 'Không tìm thấy phòng chơi!' };
    }

    if (room.isPrivate && room.passcode && room.passcode !== passcode) {
      return { success: false, error: 'Mật mã phòng không chính xác!' };
    }

    const currentCount = Object.keys(room.players).length;
    if (currentCount >= room.maxPlayers && !room.players[player.id]) {
      return { success: false, error: 'Phòng đã đủ số lượng người chơi (Tối đa 30)!' };
    }

    player.isHost = room.hostId === player.id;
    player.points = this.ledger.getBalance(player.deviceId);
    room.players[player.id] = { ...player, connected: true };
    room.updatedAt = Date.now();

    this.emitEvent(room.id, 'room:playerJoined', player);
    return { success: true, room };
  }

  public leaveRoom(
    playerId: string,
    roomId: string
  ): { room?: Room; newHostId?: string; roomDeleted?: boolean } {
    const room = this.rooms.get(roomId);
    if (!room || !room.players[playerId]) {
      return {};
    }

    delete room.players[playerId];
    room.updatedAt = Date.now();

    const remainingPlayerIds = Object.keys(room.players);

    if (remainingPlayerIds.length === 0) {
      this.rooms.delete(roomId);
      this.roomsByCode.delete(room.code);
      this.sseListeners.delete(roomId);
      this.chatMessages.delete(roomId);
      return { roomDeleted: true };
    }

    let newHostId: string | undefined;
    if (room.hostId === playerId) {
      newHostId = remainingPlayerIds[0];
      room.hostId = newHostId;
      if (room.players[newHostId]) {
        room.players[newHostId].isHost = true;
      }
    }

    this.emitEvent(room.id, 'room:playerLeft', { playerId, newHostId });
    if (newHostId) {
      this.emitEvent(room.id, 'room:hostChanged', { newHostId });
    }

    return { room, newHostId, roomDeleted: false };
  }

  public startRound(
    roomId: string,
    durationSeconds = 25
  ): { success: boolean; round?: Round; error?: string } {
    const room = this.rooms.get(roomId);
    if (!room) return { success: false, error: 'Phòng không tồn tại' };

    const current = room.currentRound;
    if (current.state !== 'WAITING' && current.state !== 'REVEALED') {
      return { success: false, error: `Không thể bắt đầu khi vòng đang ở trạng thái ${current.state}` };
    }

    const newRoundId = 'rnd_' + crypto.randomUUID().slice(0, 8);
    const newRoundNumber = current.state === 'REVEALED' ? current.roundNumber + 1 : current.roundNumber;

    const round: Round = {
      id: newRoundId,
      roomId,
      roundNumber: newRoundNumber,
      state: 'BETTING',
      startedAt: Date.now(),
      bettingEndsAt: Date.now() + durationSeconds * 1000,
      totalBetsAmount: 0,
    };

    room.currentRound = round;
    this.roomBets.set(newRoundId, []);
    room.updatedAt = Date.now();

    this.emitEvent(room.id, 'round:started', {
      roundId: round.id,
      roundNumber: round.roundNumber,
      bettingEndsAt: round.bettingEndsAt,
      durationSeconds,
    });

    return { success: true, round };
  }

  public placeBet(
    roomId: string,
    playerId: string,
    req: PlaceBetRequest
  ): { success: boolean; bet?: Bet; newBalance?: number; error?: string } {
    const room = this.rooms.get(roomId);
    if (!room) return { success: false, error: 'Phòng không tồn tại' };

    const round = room.currentRound;
    try {
      assertCanBet(round.state);
    } catch {
      return { success: false, error: 'Đã hết thời gian đặt cược hoặc vòng chơi đã khóa!' };
    }

    const player = room.players[playerId];
    if (!player) return { success: false, error: 'Người chơi không có trong phòng' };

    if (req.amount <= 0 || !Number.isInteger(req.amount)) {
      return { success: false, error: 'Số điểm cược không hợp lệ!' };
    }

    try {
      const { newBalance } = this.ledger.reserveBet(
        player.deviceId,
        roomId,
        round.id,
        req.amount,
        req.clientBetId
      );

      const bet: Bet = {
        id: 'bet_' + crypto.randomUUID().slice(0, 8),
        clientBetId: req.clientBetId,
        roomId,
        roundId: round.id,
        playerId,
        symbol: req.symbol,
        amount: req.amount,
        payoutAmount: 0,
        netProfit: 0,
        createdAt: Date.now(),
      };

      const bets = this.roomBets.get(round.id) || [];
      bets.push(bet);
      this.roomBets.set(round.id, bets);

      round.totalBetsAmount += req.amount;
      player.points = newBalance;

      const boardSummary = this.getBoardSummary(roomId);
      this.emitEvent(room.id, 'round:betPlaced', { bet, boardSummary });

      return { success: true, bet, newBalance };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Đặt cược thất bại';
      return { success: false, error: message };
    }
  }

  public async lockAndRoll(
    roomId: string,
    waitDurationMs: number = 3800
  ): Promise<{
    success: boolean;
    diceResult?: DiceResult;
    settlements?: PlayerSettlement[];
    error?: string;
  }> {
    const room = this.rooms.get(roomId);
    if (!room) return { success: false, error: 'Phòng không tồn tại' };

    const round = room.currentRound;
    if (round.state !== 'BETTING') {
      return { success: false, error: 'Vòng không ở trạng thái đặt cược' };
    }

    round.state = 'ROLLING';
    room.updatedAt = Date.now();

    // Broadcast shaking state to all SSE subscribers
    this.emitEvent(room.id, 'round:rolling', {
      roundId: round.id,
      shakingDurationMs: waitDurationMs,
    });

    // Hold connection during suspenseful 3D shaking phase
    if (waitDurationMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, waitDurationMs));
    }

    // Roll cryptographic dice
    const diceResult = rollDice();
    round.diceResult = diceResult;

    // Settle all bets
    const bets = this.roomBets.get(round.id) || [];
    const outcome = settleRound(diceResult, bets, room.players);

    for (const s of outcome.playerSettlements) {
      if (s.grossPayout > 0) {
        const p = room.players[s.playerId];
        if (p) {
          this.ledger.creditPayout(p.deviceId, roomId, round.id, s.grossPayout, s.netProfit);
        }
      }
      if (room.players[s.playerId]) {
        room.players[s.playerId].points = s.newBalance;
      }
    }

    round.state = 'REVEALED';
    round.settledAt = Date.now();
    round.settlements = outcome.playerSettlements;
    room.roundHistory.unshift({ ...round });
    if (room.roundHistory.length > 20) room.roundHistory.pop();

    room.updatedAt = Date.now();

    const boardSummary = this.getBoardSummary(roomId);
    this.emitEvent(room.id, 'round:settled', {
      roundId: round.id,
      diceResult,
      settlements: outcome.playerSettlements,
      boardSummary,
    });

    return {
      success: true,
      diceResult,
      settlements: outcome.playerSettlements,
    };
  }

  public getBoardSummary(roomId: string, currentUserId?: string) {
    const room = this.rooms.get(roomId);
    if (!room) return [];
    const bets = this.roomBets.get(room.currentRound.id) || [];
    return summarizeBoardBets(bets, currentUserId, room.players);
  }

  public addChatMessage(roomId: string, message: ChatMessage) {
    const list = this.chatMessages.get(roomId) || [];
    list.push(message);
    if (list.length > 50) list.shift();
    this.chatMessages.set(roomId, list);
    this.emitEvent(roomId, 'chat:message', message);
  }

  public getChatMessages(roomId: string): ChatMessage[] {
    return this.chatMessages.get(roomId) || [];
  }

  // Server-Sent Events (SSE) Bus
  public subscribe(roomId: string, listener: SSEListener): () => void {
    let set = this.sseListeners.get(roomId);
    if (!set) {
      set = new Set<SSEListener>();
      this.sseListeners.set(roomId, set);
    }
    set.add(listener);
    return () => {
      set?.delete(listener);
    };
  }

  public emitEvent(roomId: string, event: string, payload: any) {
    const set = this.sseListeners.get(roomId);
    if (set) {
      for (const listener of set) {
        try {
          listener({ event, payload });
        } catch {}
      }
    }
  }
}

// Global Singleton for Vercel Serverless Function instances
declare global {
  var __baucuaRoomStore: VercelRoomStore | undefined;
}

export function getRoomStore(): VercelRoomStore {
  if (!globalThis.__baucuaRoomStore) {
    globalThis.__baucuaRoomStore = new VercelRoomStore();
  }
  return globalThis.__baucuaRoomStore;
}
