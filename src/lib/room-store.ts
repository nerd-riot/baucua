import {
  Bet,
  ChatMessage,
  DealerType,
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

export const BOT_PLAYER_ID = 'p_bot_dealer';
export const BOT_DEVICE_ID = 'dev_bot_dealer';
export const DEFAULT_BOT_ROOM_CODE = 'BAUCUA';

class VercelRoomStore {
  private rooms = new Map<string, Room>();
  private roomsByCode = new Map<string, string>(); // code -> id
  private roomBets = new Map<string, Bet[]>(); // roundId -> Bet[]
  private ledger = new LedgerManager();
  private sseListeners = new Map<string, Set<SSEListener>>(); // roomId -> Set<listener>
  private chatMessages = new Map<string, ChatMessage[]>(); // roomId -> ChatMessage[]
  private botTimers = new Map<string, NodeJS.Timeout>(); // roomId -> timer
  private rollingLocks = new Set<string>(); // roomId currently rolling

  constructor() {
    this.ensureDefaultBotRoom();
  }

  private clearBotTimer(roomId: string) {
    const existing = this.botTimers.get(roomId);
    if (existing) {
      clearTimeout(existing);
      this.botTimers.delete(roomId);
    }
  }

  private hasHumanPlayers(room: Room): boolean {
    return Object.values(room.players).some((p) => !p.isBot && p.connected);
  }

  private scheduleBotAction(roomId: string, delayMs: number, action: () => void) {
    this.clearBotTimer(roomId);
    const timer = setTimeout(() => {
      this.botTimers.delete(roomId);
      action();
    }, delayMs);
    if (typeof timer.unref === 'function') {
      timer.unref();
    }
    this.botTimers.set(roomId, timer);
  }

  /**
   * Self-healing state machine check for Bot-hosted rooms.
   * Ensures the Bot automatically starts rounds, locks & rolls when betting ends,
   * and starts the next round after results are revealed.
   */
  public tickBotRoom(room: Room) {
    if (room.dealerType !== 'bot') return;
    if (!this.hasHumanPlayers(room)) {
      this.clearBotTimer(room.id);
      return;
    }

    const round = room.currentRound;
    const now = Date.now();

    if (round.state === 'WAITING') {
      this.clearBotTimer(room.id);
      this.startRound(room.id, 20);
    } else if (round.state === 'BETTING' && round.bettingEndsAt) {
      const remaining = round.bettingEndsAt - now;
      if (remaining <= 0 && !this.rollingLocks.has(room.id)) {
        this.clearBotTimer(room.id);
        void this.lockAndRoll(room.id);
      } else if (remaining > 0 && !this.botTimers.has(room.id)) {
        this.scheduleBotAction(room.id, remaining, () => {
          void this.lockAndRoll(room.id);
        });
      }
    } else if (round.state === 'REVEALED' && round.settledAt) {
      const nextStartDelay = 14000; // 2.2s bowl reveal + ~12s result modal review
      const remaining = round.settledAt + nextStartDelay - now;
      if (remaining <= 0) {
        this.clearBotTimer(room.id);
        this.startRound(room.id, 20);
      } else if (!this.botTimers.has(room.id)) {
        this.scheduleBotAction(room.id, remaining, () => {
          const r = this.rooms.get(room.id);
          if (r && r.currentRound.state === 'REVEALED' && this.hasHumanPlayers(r)) {
            this.startRound(r.id, 20);
          }
        });
      }
    }
  }

  public getLedger(): LedgerManager {
    return this.ledger;
  }

  public createBotDealer(): Player {
    this.ledger.getOrCreateAccount(BOT_DEVICE_ID, 1_000_000);
    return {
      id: BOT_PLAYER_ID,
      nickname: '🤖 Nhà Cái Bot',
      avatarId: 'char_boy_ao_dai_xanh',
      points: this.ledger.getBalance(BOT_DEVICE_ID),
      deviceId: BOT_DEVICE_ID,
      isReady: true,
      isHost: true,
      isBot: true,
      connected: true,
      joinedAt: Date.now(),
      lastActiveAt: Date.now(),
    };
  }

  public ensureDefaultBotRoom(): Room {
    const existingId = this.roomsByCode.get(DEFAULT_BOT_ROOM_CODE);
    if (existingId && this.rooms.has(existingId)) {
      return this.rooms.get(existingId)!;
    }

    const roomId = 'room_default_bot';
    const roundId = 'rnd_' + crypto.randomUUID().slice(0, 8);
    const botDealer = this.createBotDealer();

    const initialRound: Round = {
      id: roundId,
      roomId,
      roundNumber: 1,
      state: 'WAITING',
      startedAt: Date.now(),
      totalBetsAmount: 0,
    };

    const room: Room = {
      id: roomId,
      code: DEFAULT_BOT_ROOM_CODE,
      name: '🏮 Sới Bầu Cua Nhà Cái Bot (Mặc Định)',
      hostId: BOT_PLAYER_ID,
      dealerType: 'bot',
      isDefault: true,
      isPrivate: false,
      maxPlayers: 30,
      players: { [BOT_PLAYER_ID]: botDealer },
      currentRound: initialRound,
      roundHistory: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.rooms.set(roomId, room);
    this.roomsByCode.set(DEFAULT_BOT_ROOM_CODE, roomId);
    this.roomBets.set(roundId, []);
    this.chatMessages.set(roomId, []);

    return room;
  }

  public reloadPlayerPoints(deviceId: string, amount = 1000): number {
    const { newBalance } = this.ledger.reloadPoints(deviceId, amount);
    const playerId = 'p_' + deviceId;
    for (const room of this.rooms.values()) {
      if (room.players[playerId]) {
        room.players[playerId].points = newBalance;
        room.updatedAt = Date.now();
      }
    }
    return newBalance;
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
      dealerType?: DealerType;
    }
  ): Room {
    const roomId = 'room_' + crypto.randomUUID().slice(0, 8);
    const code = this.generateRoomCode();
    const roundId = 'rnd_' + crypto.randomUUID().slice(0, 8);
    const dealerType: DealerType = options.dealerType || 'player';

    const initialRound: Round = {
      id: roundId,
      roomId,
      roundNumber: 1,
      state: 'WAITING',
      startedAt: Date.now(),
      totalBetsAmount: 0,
    };

    let hostId: string;
    let playersMap: Record<string, Player>;

    if (dealerType === 'bot') {
      const botDealer = this.createBotDealer();
      creator.isHost = false;
      creator.isReady = true;
      hostId = BOT_PLAYER_ID;
      playersMap = {
        [BOT_PLAYER_ID]: botDealer,
        [creator.id]: { ...creator },
      };
    } else {
      creator.isHost = true;
      creator.isReady = true;
      hostId = creator.id;
      playersMap = {
        [creator.id]: { ...creator },
      };
    }

    const room: Room = {
      id: roomId,
      code,
      name: options.name.trim().slice(0, 40) || 'Bầu Cua Tết Giáp Thìn',
      hostId,
      dealerType,
      isPrivate: options.isPrivate,
      passcode: options.passcode,
      maxPlayers: Math.min(Math.max(options.maxPlayers || 30, 2), 30),
      players: playersMap,
      currentRound: initialRound,
      roundHistory: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.rooms.set(roomId, room);
    this.roomsByCode.set(code, roomId);
    this.roomBets.set(roundId, []);
    this.chatMessages.set(roomId, []);

    if (room.dealerType === 'bot') {
      this.tickBotRoom(room);
    }

    return room;
  }

  public getRoom(roomIdOrCode: string): Room | undefined {
    this.ensureDefaultBotRoom();
    let room = this.rooms.get(roomIdOrCode);
    if (!room) {
      const id = this.roomsByCode.get(roomIdOrCode.toUpperCase());
      if (id) room = this.rooms.get(id);
    }
    if (room) {
      this.tickBotRoom(room);
    }
    return room;
  }

  public listPublicRooms(): RoomSummary[] {
    this.ensureDefaultBotRoom();
    const summaries: RoomSummary[] = [];
    for (const room of this.rooms.values()) {
      if (!room.isPrivate) {
        const host = room.players[room.hostId];
        summaries.push({
          id: room.id,
          code: room.code,
          name: room.name,
          hostNickname: host ? host.nickname : (room.dealerType === 'bot' ? '🤖 Nhà Cái Bot' : 'Host'),
          dealerType: room.dealerType,
          isDefault: room.isDefault,
          isPrivate: room.isPrivate,
          playerCount: Object.keys(room.players).length,
          maxPlayers: room.maxPlayers,
          status: room.currentRound.state,
          createdAt: room.createdAt,
        });
      }
    }
    return summaries.sort((a, b) => {
      if (a.isDefault !== b.isDefault) return a.isDefault ? -1 : 1;
      return b.createdAt - a.createdAt;
    });
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

    const humanCount = Object.values(room.players).filter((p) => !p.isBot).length;
    if (humanCount >= room.maxPlayers && !room.players[player.id]) {
      return { success: false, error: 'Phòng đã đủ số lượng người chơi (Tối đa 30)!' };
    }

    player.isHost = room.hostId === player.id;
    player.points = this.ledger.getBalance(player.deviceId);
    room.players[player.id] = { ...player, connected: true };
    room.updatedAt = Date.now();

    this.emitEvent(room.id, 'room:playerJoined', player);
    if (room.dealerType === 'bot') {
      this.tickBotRoom(room);
    }
    return { success: true, room };
  }

  public leaveRoom(
    playerId: string,
    roomId: string
  ): { room?: Room; newHostId?: string; roomDeleted?: boolean } {
    const room = this.rooms.get(roomId);
    if (!room || !room.players[playerId] || room.players[playerId].isBot) {
      return {};
    }

    delete room.players[playerId];
    room.updatedAt = Date.now();

    const remainingHumanIds = Object.keys(room.players).filter(
      (id) => !room.players[id]?.isBot
    );

    if (remainingHumanIds.length === 0) {
      this.clearBotTimer(roomId);
      if (room.isDefault) {
        // Default bot room is never deleted; reset round to WAITING if idle
        if (room.currentRound.state !== 'ROLLING') {
          const roundId = 'rnd_' + crypto.randomUUID().slice(0, 8);
          room.currentRound = {
            id: roundId,
            roomId: room.id,
            roundNumber: room.currentRound.roundNumber,
            state: 'WAITING',
            startedAt: Date.now(),
            totalBetsAmount: 0,
          };
          this.roomBets.set(roundId, []);
        }
        this.emitEvent(room.id, 'room:playerLeft', { playerId });
        return { room, roomDeleted: false };
      }

      this.rooms.delete(roomId);
      this.roomsByCode.delete(room.code);
      this.sseListeners.delete(roomId);
      this.chatMessages.delete(roomId);
      return { roomDeleted: true };
    }

    let newHostId: string | undefined;
    if (room.hostId === playerId && room.dealerType === 'player') {
      newHostId = remainingHumanIds[0];
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
    if (room.dealerType === 'bot' && current.state === 'BETTING') {
      return { success: true, round: current };
    }
    if (current.state !== 'WAITING' && current.state !== 'REVEALED') {
      return { success: false, error: `Không thể bắt đầu khi vòng đang ở trạng thái ${current.state}` };
    }

    if (room.dealerType === 'player') {
      const host = room.players[room.hostId];
      if (host && host.points <= 0) {
        return {
          success: false,
          error: 'Nhà cái đã hết điểm! Vui lòng nạp thêm điểm (+) trước khi mở ván mới.',
        };
      }
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

    if (room.dealerType === 'bot') {
      this.scheduleBotAction(room.id, durationSeconds * 1000, () => {
        void this.lockAndRoll(room.id);
      });
    }

    return { success: true, round };
  }

  public placeBet(
    roomId: string,
    playerId: string,
    req: PlaceBetRequest
  ): {
    success: boolean;
    bet?: Bet;
    newBalance?: number;
    boardSummary?: ReturnType<VercelRoomStore['getBoardSummary']>;
    error?: string;
  } {
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

    if (room.dealerType === 'player' && playerId === room.hostId) {
      return {
        success: false,
        error: 'Bạn đang là Nhà Cái (Chủ phòng) nên không thể tự đặt cược!',
      };
    }

    if (room.dealerType === 'player') {
      const host = room.players[room.hostId];
      if (host && host.points <= 0) {
        return {
          success: false,
          error: 'Nhà cái đã hết điểm, đang chờ Nhà cái nạp thêm điểm!',
        };
      }
    }

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

      return { success: true, bet, newBalance, boardSummary };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Đặt cược thất bại';
      return { success: false, error: message };
    }
  }

  public cancelBets(
    roomId: string,
    playerId: string,
    symbol?: SymbolId
  ): {
    success: boolean;
    refundedAmount?: number;
    newBalance?: number;
    boardSummary?: ReturnType<VercelRoomStore['getBoardSummary']>;
    error?: string;
  } {
    const room = this.rooms.get(roomId);
    if (!room) return { success: false, error: 'Phòng không tồn tại' };

    const round = room.currentRound;
    try {
      assertCanBet(round.state);
    } catch {
      return {
        success: false,
        error: 'Đã hết thời gian đặt cược, không thể rút lại tiền cược!',
      };
    }

    if (round.bettingEndsAt && Date.now() >= round.bettingEndsAt) {
      return {
        success: false,
        error: 'Đã hết thời gian đặt cược, không thể rút lại tiền cược!',
      };
    }

    const player = room.players[playerId];
    if (!player) return { success: false, error: 'Người chơi không có trong phòng' };

    const allBets = this.roomBets.get(round.id) || [];
    const betsToCancel = allBets.filter(
      (b) => b.playerId === playerId && (!symbol || b.symbol === symbol)
    );

    if (betsToCancel.length === 0) {
      return { success: false, error: 'Không có khoản cược nào để rút lại!' };
    }

    const refundedAmount = betsToCancel.reduce((sum, b) => sum + b.amount, 0);
    const remainingBets = allBets.filter(
      (b) => !(b.playerId === playerId && (!symbol || b.symbol === symbol))
    );

    this.roomBets.set(round.id, remainingBets);
    round.totalBetsAmount = Math.max(0, round.totalBetsAmount - refundedAmount);

    const { newBalance } = this.ledger.refundBet(
      player.deviceId,
      roomId,
      round.id,
      refundedAmount
    );
    player.points = newBalance;
    room.updatedAt = Date.now();

    const boardSummary = this.getBoardSummary(roomId);
    this.emitEvent(room.id, 'round:betPlaced', {
      bet: null,
      boardSummary,
    });

    return {
      success: true,
      refundedAmount,
      newBalance,
      boardSummary,
    };
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
    if (round.state !== 'BETTING' || this.rollingLocks.has(roomId)) {
      return { success: false, error: 'Vòng không ở trạng thái đặt cược' };
    }

    this.clearBotTimer(roomId);
    this.rollingLocks.add(roomId);
    round.state = 'ROLLING';
    room.updatedAt = Date.now();

    try {
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

      // Settle all bets including Dealer (Host or Bot) settlement
      const bets = this.roomBets.get(round.id) || [];
      const dealerId = room.dealerType === 'bot' ? BOT_PLAYER_ID : room.hostId;
      const outcome = settleRound(diceResult, bets, room.players, dealerId);

      for (const s of outcome.playerSettlements) {
        if (s.isDealer) {
          const dealer = room.players[s.playerId];
          if (dealer) {
            const { newBalance } = this.ledger.settleDealerRound(
              dealer.deviceId,
              roomId,
              round.id,
              s.netProfit
            );
            s.newBalance = newBalance;
            dealer.points = newBalance;

            // Keep Bot house solvent automatically
            if (dealer.isBot && dealer.points < 100_000) {
              const reloaded = this.ledger.reloadPoints(dealer.deviceId, 1_000_000);
              dealer.points = reloaded.newBalance;
              s.newBalance = reloaded.newBalance;
            }
          }
        } else {
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

      if (room.dealerType === 'bot' && this.hasHumanPlayers(room)) {
        this.scheduleBotAction(room.id, 14000, () => {
          const r = this.rooms.get(room.id);
          if (r && r.currentRound.state === 'REVEALED' && this.hasHumanPlayers(r)) {
            this.startRound(r.id, 20);
          }
        });
      }

      return {
        success: true,
        diceResult,
        settlements: outcome.playerSettlements,
      };
    } finally {
      this.rollingLocks.delete(roomId);
    }
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
  var __baucuaRoomStoreVersion: number | undefined;
}

const STORE_VERSION = 5;

export function getRoomStore(): VercelRoomStore {
  if (!globalThis.__baucuaRoomStore || globalThis.__baucuaRoomStoreVersion !== STORE_VERSION) {
    globalThis.__baucuaRoomStore = new VercelRoomStore();
    globalThis.__baucuaRoomStoreVersion = STORE_VERSION;
  }
  return globalThis.__baucuaRoomStore;
}
