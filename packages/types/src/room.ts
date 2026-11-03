import { Player } from './player';
import { Round } from './round';

export interface RoomConfig {
  name: string;
  isPrivate: boolean;
  passcode?: string;
  maxPlayers: number; // 2 to 30
  betDurationSeconds: number; // default 20s
}

export interface Room {
  id: string;
  code: string; // 6 uppercase alphanumeric
  name: string;
  hostId: string;
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
  isPrivate: boolean;
  playerCount: number;
  maxPlayers: number;
  status: Round['state'];
  createdAt: number;
}
