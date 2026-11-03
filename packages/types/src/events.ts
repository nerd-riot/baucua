import { Player } from './player.js';
import { Room, RoomSummary } from './room.js';
import { Bet, BoardBetSummary, PlaceBetRequest } from './bet.js';
import { DiceResult, PlayerSettlement, Round, RoundState } from './round.js';
import { SymbolId } from './symbols.js';

export interface ChatMessage {
  id: string;
  senderId: string;
  senderNickname: string;
  avatarId: string;
  text?: string;
  stickerId?: string; // quick chat sticker
  isSystem?: boolean;
  timestamp: number;
}

// Client-to-Server Events
export interface ClientToServerEvents {
  // Lobby & Identity
  'guest:login': (
    payload: { nickname: string; avatarId: string; deviceId: string },
    callback: (res: { success: boolean; player?: Player; error?: string }) => void
  ) => void;

  'lobby:listRooms': (
    callback: (res: { success: boolean; rooms: RoomSummary[] }) => void
  ) => void;

  'room:create': (
    payload: {
      name: string;
      isPrivate: boolean;
      passcode?: string;
      maxPlayers?: number;
      betDurationSeconds?: number;
    },
    callback: (res: { success: boolean; room?: Room; error?: string }) => void
  ) => void;

  'room:join': (
    payload: { roomIdOrCode: string; passcode?: string },
    callback: (res: { success: boolean; room?: Room; error?: string }) => void
  ) => void;

  'room:leave': (
    callback: (res: { success: boolean }) => void
  ) => void;

  'room:setReady': (
    payload: { isReady: boolean },
    callback: (res: { success: boolean }) => void
  ) => void;

  // Host Controls
  'host:startRound': (
    callback: (res: { success: boolean; error?: string }) => void
  ) => void;

  'host:lockBetting': (
    callback: (res: { success: boolean; error?: string }) => void
  ) => void;

  'host:revealDice': (
    callback: (res: { success: boolean; error?: string }) => void
  ) => void;

  // Betting
  'bet:place': (
    payload: PlaceBetRequest,
    callback: (res: {
      success: boolean;
      bet?: Bet;
      newBalance?: number;
      error?: string;
    }) => void
  ) => void;

  // Chat & Social
  'chat:send': (
    payload: { text?: string; stickerId?: string },
    callback: (res: { success: boolean; error?: string }) => void
  ) => void;

  // Daily/Bonus reload
  'player:reloadPoints': (
    callback: (res: { success: boolean; newBalance: number }) => void
  ) => void;
}

// Server-to-Client Events
export interface ServerToClientEvents {
  'lobby:roomsUpdated': (rooms: RoomSummary[]) => void;
  'room:stateSync': (room: Room) => void;
  'room:playerJoined': (player: Player) => void;
  'room:playerLeft': (payload: { playerId: string; newHostId?: string }) => void;
  'room:hostChanged': (payload: { newHostId: string }) => void;
  'room:playerReadyChanged': (payload: { playerId: string; isReady: boolean }) => void;

  // Round Lifecycle
  'round:started': (payload: {
    roundId: string;
    roundNumber: number;
    bettingEndsAt: number;
    durationSeconds: number;
  }) => void;

  'round:betPlaced': (payload: {
    bet: Bet;
    boardSummary: BoardBetSummary[];
  }) => void;

  'round:rolling': (payload: {
    roundId: string;
    shakingDurationMs: number;
  }) => void;

  'round:settled': (payload: {
    roundId: string;
    diceResult: DiceResult;
    settlements: PlayerSettlement[];
    boardSummary: BoardBetSummary[];
  }) => void;

  // Chat
  'chat:message': (message: ChatMessage) => void;

  // System
  'error:notification': (payload: { code: string; message: string }) => void;
}
