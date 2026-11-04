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
    <div className="bg-gradient-to-b from-red-950/95 via-tet-card to-black/95 rounded-2xl border border-amber-500/40 p-3 shadow-royal w-full select-none shrink-0">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-amber-500/20">
        <span className="text-xs sm:text-sm font-extrabold text-amber-300 flex items-center gap-1.5 uppercase tracking-wide">
          <Users size={16} className="text-amber-400" /> Người Chơi ({players.length}/{room.maxPlayers})
        </span>
        <span className="text-[10px] text-amber-400/70 font-semibold bg-black/40 px-2 py-0.5 rounded-full border border-amber-500/20">
          Đang online
        </span>
      </div>

      {/* Players List: Clean, responsive vertical stack with smooth scroll */}
      <div className="flex flex-col space-y-1.5 max-h-32 sm:max-h-40 overflow-y-auto pr-1 custom-scrollbar">
        {players.map((p) => {
          const isMe = p.id === currentPlayer.id;
          const isHost = room.hostId === p.id;

          return (
            <div
              key={p.id}
              className={`flex items-center justify-between p-2 rounded-xl border transition-all ${
                isMe
                  ? 'bg-gradient-to-r from-amber-500/20 via-red-900/40 to-amber-500/10 border-amber-400 shadow-gold-glow'
                  : 'bg-black/50 hover:bg-black/70 border-amber-900/40'
              }`}
            >
              {/* Left: Avatar + Crown + Nickname */}
              <div className="flex items-center space-x-2.5 min-w-0 flex-1 mr-2">
                <div className="relative w-9 h-9 rounded-full overflow-hidden bg-red-900/60 border-2 border-amber-400/60 shrink-0 shadow">
                  <img
                    src={getAvatarPath(p.avatarId)}
                    alt={p.nickname}
                    className="w-full h-full object-cover"
                  />
                  {isHost && (
                    <div
                      className="absolute -top-1 -right-1 bg-amber-400 text-red-950 rounded-full p-0.5 shadow-md"
                      title="Chủ phòng"
                    >
                      <Crown size={11} fill="currentColor" />
                    </div>
                  )}
                </div>

                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-black text-amber-100 truncate flex items-center gap-1.5">
                    {p.nickname}
                    {isMe && (
                      <span className="bg-amber-400/20 text-amber-300 text-[9px] px-1.5 py-0.2 rounded-full border border-amber-400/40 shrink-0">
                        Bạn
                      </span>
                    )}
                  </span>
                  {isHost && (
                    <span className="text-[10px] text-amber-400/80 font-bold flex items-center gap-0.5">
                      {p.isBot ? '🤖 Nhà Cái Bot' : '👑 Nhà Cái (Chủ phòng)'}
                    </span>
                  )}
                </div>
              </div>

              {/* Right: Points Badge */}
              <div className="flex items-center space-x-1 bg-black/70 px-2.5 py-1 rounded-full border border-amber-500/30 shrink-0">
                <span className="text-xs">💰</span>
                <span className="text-xs font-mono font-black text-amber-300">
                  {p.points.toLocaleString()}
                </span>
                <span className="text-[10px] text-amber-400/70 font-bold">pts</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
