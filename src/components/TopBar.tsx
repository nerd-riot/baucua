'use client';

import React, { useState, useEffect } from 'react';
import { Player, Room } from '@/types';
import { sound } from '@/lib/sound';
import { Volume2, VolumeX, Copy, Check, PlusCircle, LogOut, Crown, Bot } from 'lucide-react';

interface TopBarProps {
  room: Room;
  currentPlayer: Player;
  onLeave: () => void;
  onReloadPoints: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  room,
  currentPlayer,
  onLeave,
  onReloadPoints,
}) => {
  const [copied, setCopied] = useState(false);
  const [isMuted, setIsMuted] = useState(sound.getMuted());

  useEffect(() => {
    return sound.subscribe((muted) => setIsMuted(muted));
  }, []);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(room.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleToggleSound = () => {
    sound.toggleMute();
  };

  return (
    <header className="w-full bg-gradient-to-r from-red-950 via-tet-red-dark to-red-950 border-b border-amber-500/30 px-4 py-2.5 flex items-center justify-between shadow-royal sticky top-0 z-30">
      {/* Left: Room Title & Room Code */}
      <div className="flex items-center space-x-3">
        <div className="flex flex-col">
          <div className="flex items-center space-x-2">
            <span className="font-bold text-amber-300 text-sm md:text-base tracking-wide flex items-center gap-1.5">
              🏮 {room.name}
            </span>
            {room.dealerType === 'bot' ? (
              <span className="bg-emerald-500/20 text-emerald-300 text-xs px-2 py-0.5 rounded-full border border-emerald-500/40 flex items-center gap-1">
                <Bot size={12} className="text-emerald-400" /> Bot làm Cái
              </span>
            ) : room.hostId === currentPlayer.id ? (
              <span className="bg-amber-500/20 text-amber-300 text-xs px-2 py-0.5 rounded-full border border-amber-500/40 flex items-center gap-1">
                <Crown size={12} className="text-amber-400" /> Bạn là Nhà Cái
              </span>
            ) : (
              <span className="bg-amber-500/20 text-amber-300 text-xs px-2 py-0.5 rounded-full border border-amber-500/40 flex items-center gap-1">
                <Crown size={12} className="text-amber-400" /> Nhà Cái: {room.players[room.hostId]?.nickname || 'Chủ phòng'}
              </span>
            )}
          </div>
          <div className="flex items-center space-x-1.5 text-xs text-amber-200/80">
            <span>Mã phòng:</span>
            <button
              onClick={handleCopyCode}
              className="font-mono font-bold bg-amber-900/60 hover:bg-amber-800/80 text-amber-300 px-2 py-0.5 rounded border border-amber-500/40 flex items-center gap-1 transition"
              title="Nhấn để sao chép mã"
            >
              {room.code}
              {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
            </button>
            <span className="hidden sm:inline">({Object.keys(room.players).length}/{room.maxPlayers} người)</span>
          </div>
        </div>
      </div>

      {/* Right: Player Points & Action Buttons */}
      <div className="flex items-center space-x-2 md:space-x-4">
        {/* Points Display */}
        <div className="flex items-center bg-black/40 border border-amber-500/50 rounded-full pl-3 pr-1 py-1 shadow-inner">
          <span className="text-amber-400 text-sm font-black mr-1.5">💰</span>
          <span className="font-extrabold text-amber-300 text-sm md:text-base tracking-wider mr-2">
            {currentPlayer.points.toLocaleString()}
          </span>
          <button
            onClick={() => {
              sound.playChip();
              onReloadPoints();
            }}
            className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-red-950 font-bold p-1 rounded-full text-xs shadow transition active:scale-95"
            title="Nhận thêm 1,000 điểm miễn phí"
          >
            <PlusCircle size={16} />
          </button>
        </div>

        {/* Audio Toggle with Clear Status Badge */}
        <button
          onClick={handleToggleSound}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-full border text-xs font-black transition active:scale-95 shadow-sm ${
            isMuted
              ? 'bg-red-950/90 text-red-300 border-red-500/60 hover:bg-red-900'
              : 'bg-emerald-950/80 text-emerald-300 border-emerald-500/60 hover:bg-emerald-900'
          }`}
          title={isMuted ? 'Bật âm thanh hiệu ứng' : 'Tắt âm thanh hiệu ứng'}
        >
          {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
          <span className="hidden xs:inline">{isMuted ? 'Tắt âm' : 'Bật âm'}</span>
        </button>

        {/* Leave Room Button */}
        <button
          onClick={onLeave}
          className="p-2 rounded-full bg-red-950/80 hover:bg-red-900 text-red-300 hover:text-red-100 border border-red-700/50 transition active:scale-95"
          title="Rời phòng"
        >
          <LogOut size={18} />
        </button>
      </div>
    </header>
  );
};
