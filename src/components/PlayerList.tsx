'use client';

import React from 'react';
import { Player, Room } from '@/types';
import { Crown, Users } from 'lucide-react';

interface PlayerListProps {
  room: Room;
  currentPlayer: Player;
}

export const PlayerList: React.FC<PlayerListProps> = ({ room, currentPlayer }) => {
  const players = Object.values(room.players);

  const getAvatarPath = (avatarId: string) => {
    return `/assets/02_characters/${avatarId}.png`;
  };

  return (
    <div className="bg-gradient-to-b from-red-950/90 to-black/90 rounded-2xl border border-amber-500/30 p-3 shadow-royal w-full">
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-amber-500/20">
        <span className="text-xs sm:text-sm font-bold text-amber-300 flex items-center gap-1.5">
          <Users size={16} className="text-amber-400" /> Danh Sách Người Chơi ({players.length}/{room.maxPlayers})
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 max-h-48 overflow-y-auto pr-1">
        {players.map((p) => {
          const isMe = p.id === currentPlayer.id;
          const isHost = room.hostId === p.id;

          return (
            <div
              key={p.id}
              className={`flex items-center space-x-2 p-1.5 rounded-xl border transition ${
                isMe
                  ? 'bg-amber-500/10 border-amber-400/80 shadow-inner'
                  : 'bg-black/40 border-amber-900/40'
              }`}
            >
              {/* Avatar */}
              <div className="relative w-8 h-8 rounded-full overflow-hidden bg-red-900/50 border border-amber-400/40 shrink-0">
                <img
                  src={getAvatarPath(p.avatarId)}
                  alt={p.nickname}
                  className="w-full h-full object-cover"
                />
                {isHost && (
                  <div className="absolute -top-1 -right-1 bg-amber-500 text-red-950 rounded-full p-0.5 shadow">
                    <Crown size={10} fill="currentColor" />
                  </div>
                )}
              </div>

              {/* Name & Points */}
              <div className="flex flex-col min-w-0 flex-1">
                <span className="text-[11px] font-bold text-amber-200 truncate flex items-center gap-1">
                  {p.nickname}
                  {isMe && <span className="text-[9px] text-amber-400">(Tôi)</span>}
                </span>
                <span className="text-[10px] text-amber-400/80 font-mono">
                  {p.points.toLocaleString()} pts
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
