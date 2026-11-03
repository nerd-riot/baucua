import crypto from 'node:crypto';
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
} from '@bau-cua/types';
import {
  LedgerManager,
  assertCanBet,
  isValidTransition,
  rollDice,
  settleRound,
  summarizeBoardBets,
} from '@bau-cua/engine';

export class RoomManager {
  private rooms = new Map<string, Room>();
  private roomsByCode = new Map<string, string>(); // code -> id
  private roomBets = new Map<string, Bet[]>(); // roundId -> Bet[]
  private roomTimers = new Map<string, NodeJS.Timeout>();
  private ledger = new LedgerManager();

  // Socket ID to Player Session mapping
  private socketToPlayer = new Map<string, { playerId: string; roomId?: string }>();
  private playerSessions = new Map<string, Player>();

  public getLedger(): LedgerManager {
    return this.ledger;
  }

  public registerPlayer(
    socketId: string,
    nickname: string,
    avatarId: string,
    deviceId: string
  ): Player {
    let player = this.playerSessions.get(deviceId);
    if (!player) {
      player = {
        id: 'p_' + crypto.randomUUID().slice(0, 8),
        nickname: nickname.trim().slice(0, 20) || 'Người Chơi',
        avatarId,
        points: this.ledger.getBalance(deviceId),
        deviceId,
        isReady: false,
        isHost: false,
        connected: true,
        joinedAt: Date.now(),
        lastActiveAt: Date.now(),
      };
      this.playerSessions.set(deviceId, player);
    } else {
      player.nickname = nickname.trim().slice(0, 20) || player.nickname;
      player.avatarId = avatarId || player.avatarId;
      player.connected = true;
      player.lastActiveAt = Date.now();
      player.points = this.ledger.getBalance(player.id);
    }

    this.socketToPlayer.set(socketId, { playerId: player.id });
    return player;
  }

  public getPlayerBySocket(socketId: string): Player | undefined {
    const mapping = this.socketToPlayer.get(socketId);
    if (!mapping) return undefined;
    for (const player of this.playerSessions.values()) {
      if (player.id === mapping.playerId) return player;
    }
    return undefined;
  }

  public generateRoomCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(crypto.randomInt(0, chars.length));
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

    // Add or update player in room
    player.isHost = room.hostId === player.id;
    room.players[player.id] = { ...player, connected: true };
    room.updatedAt = Date.now();

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

    // If room is empty, clean it up
    if (remainingPlayerIds.length === 0) {
      const timer = this.roomTimers.get(roomId);
      if (timer) clearTimeout(timer);
      this.roomTimers.delete(roomId);
      this.rooms.delete(roomId);
      this.roomsByCode.delete(room.code);
      return { roomDeleted: true };
    }

    // Host migration if the host leaves
    let newHostId: string | undefined;
    if (room.hostId === playerId) {
      newHostId = remainingPlayerIds[0];
      room.hostId = newHostId;
      if (room.players[newHostId]) {
        room.players[newHostId].isHost = true;
      }
    }

    return { room, newHostId, roomDeleted: false };
  }

  public setPlayerReady(roomId: string, playerId: string, isReady: boolean): boolean {
    const room = this.rooms.get(roomId);
    if (!room || !room.players[playerId]) return false;
    room.players[playerId].isReady = isReady;
    room.updatedAt = Date.now();
    return true;
  }

  public startRound(
    roomId: string,
    durationSeconds = 20
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
      // 1. Reserve points in ledger
      const { newBalance } = this.ledger.reserveBet(
        playerId,
        roomId,
        round.id,
        req.amount,
        req.clientBetId
      );

      // 2. Create bet record
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

      return { success: true, bet, newBalance };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Đặt cược thất bại';
      return { success: false, error: message };
    }
  }

  public getBoardSummary(roomId: string, currentUserId?: string) {
    const room = this.rooms.get(roomId);
    if (!room) return [];
    const bets = this.roomBets.get(room.currentRound.id) || [];
    return summarizeBoardBets(bets, currentUserId);
  }

  public rollAndSettle(roomId: string): {
    success: boolean;
    diceResult?: DiceResult;
    settlements?: PlayerSettlement[];
    error?: string;
  } {
    const room = this.rooms.get(roomId);
    if (!room) return { success: false, error: 'Phòng không tồn tại' };

    const round = room.currentRound;
    if (round.state !== 'ROLLING') {
      round.state = 'ROLLING';
    }

    // Roll cryptographic dice
    const diceResult = rollDice();
    round.diceResult = diceResult;

    // Settle all bets
    const bets = this.roomBets.get(round.id) || [];
    const outcome = settleRound(diceResult, bets, room.players);

    // Commit payouts to ledger and update player state
    for (const s of outcome.playerSettlements) {
      if (s.grossPayout > 0) {
        this.ledger.creditPayout(s.playerId, roomId, round.id, s.grossPayout, s.netProfit);
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

    return {
      success: true,
      diceResult,
      settlements: outcome.playerSettlements,
    };
  }

  public setRoomTimer(roomId: string, timer: NodeJS.Timeout) {
    const existing = this.roomTimers.get(roomId);
    if (existing) clearTimeout(existing);
    this.roomTimers.set(roomId, timer);
  }

  public clearRoomTimer(roomId: string) {
    const existing = this.roomTimers.get(roomId);
    if (existing) clearTimeout(existing);
    this.roomTimers.delete(roomId);
  }
}
