import { Player } from './player';
import { Round } from './round';

export type DealerType = 'bot' | 'player';

export interface RoomConfig {
  name: string;
  isPrivate: boolean;
  passcode?: string;
  maxPlayers: number; // 2 to 30
  betDurationSeconds: number; // default 20s
  dealerType?: DealerType;
}

export interface Room {
  id: string;
  code: string; // 6 uppercase alphanumeric
  name: string;
  hostId: string;
  dealerType: DealerType;
  isDefault?: boolean;
  isPrivate: boolean;
  passcode?: string;
  maxPlayers: number;
  players: Record<string, Player>;
  currentRound: Round;
  roundHistory: Round[];
  createdAt: number;
  updatedAt: number;
}

export interface RoomSummary {
  id: string;
  code: string;
  name: string;
  hostNickname: string;
  dealerType: DealerType;
  isDefault?: boolean;
  isPrivate: boolean;
  playerCount: number;
  maxPlayers: number;
  status: Round['state'];
  createdAt: number;
}
