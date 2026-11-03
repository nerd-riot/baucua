'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DiceResult, Player, Room, RoundState, SYMBOLS, SymbolId } from '@bau-cua/types';
import { sound } from '@/lib/sound';
import { Play, Lock, Sparkles, Clock } from 'lucide-react';

interface DiceShakerProps {
  room: Room;
  currentPlayer: Player;
  onStartRound: () => void;
  onLockBetting: () => void;
}

export const DiceShaker: React.FC<DiceShakerProps> = ({
  room,
  currentPlayer,
  onStartRound,
  onLockBetting,
}) => {
  const currentRound = room.currentRound;
  const isHost = room.hostId === currentPlayer.id;
  const state: RoundState = currentRound.state;
  const diceResult: DiceResult | undefined = currentRound.diceResult;

  const [timeLeft, setTimeLeft] = useState<number>(0);

  // Countdown timer calculation
  useEffect(() => {
    if (state !== 'BETTING' || !currentRound.bettingEndsAt) {
      setTimeLeft(0);
      return;
    }

    const interval = setInterval(() => {
      const remainingMs = Math.max(0, currentRound.bettingEndsAt! - Date.now());
      const seconds = Math.ceil(remainingMs / 1000);
      setTimeLeft(seconds);
      if (seconds <= 3 && seconds > 0) {
        sound.playTick();
      }
    }, 500);

    return () => clearInterval(interval);
  }, [state, currentRound.bettingEndsAt]);

  // Play shake sound on rolling state
  useEffect(() => {
    if (state === 'ROLLING') {
      sound.playDiceShake();
      const interval = setInterval(() => {
        sound.playDiceShake();
      }, 700);
      return () => clearInterval(interval);
    }
  }, [state]);

  const getSymbolImage = (id: SymbolId) => {
    const map: Record<SymbolId, string> = {
      [SymbolId.BAU]: '/assets/bau.jpg',
      [SymbolId.CUA]: '/assets/cua.jpg',
      [SymbolId.TOM]: '/assets/tom.jpg',
      [SymbolId.CA]:  '/assets/ca.jpg',
      [SymbolId.GA]:  '/assets/ga.jpg',
      [SymbolId.NAI]: '/assets/nai.jpg',
    };
    return map[id] || '/assets/04_animals_board/card_bau.png';
  };

  return (
    <div className="relative flex flex-col items-center justify-center p-4 bg-gradient-to-b from-red-950/90 via-tet-card to-black/90 rounded-2xl border-2 border-amber-500/40 shadow-royal overflow-hidden max-w-xl mx-auto w-full">
      {/* Decorative festive corners */}
      <div className="absolute top-2 left-2 text-amber-500/30 text-xs select-none">❖</div>
      <div className="absolute top-2 right-2 text-amber-500/30 text-xs select-none">❖</div>
      <div className="absolute bottom-2 left-2 text-amber-500/30 text-xs select-none">❖</div>
      <div className="absolute bottom-2 right-2 text-amber-500/30 text-xs select-none">❖</div>

      {/* Header Status Bar */}
      <div className="flex items-center justify-between w-full mb-3 px-2">
        <div className="flex items-center space-x-2">
          <span className="text-xs uppercase tracking-wider font-extrabold text-amber-300/80 bg-red-900/60 px-2.5 py-1 rounded-full border border-amber-500/30">
            Ván #{currentRound.roundNumber}
          </span>
          <span className="text-xs font-semibold text-amber-200">
            {state === 'WAITING' && 'Chờ bắt đầu ván mới'}
            {state === 'BETTING' && 'Đang đặt cược'}
            {state === 'ROLLING' && 'Đang xóc đĩa...'}
            {state === 'REVEALED' && 'Đã mở bát!'}
          </span>
        </div>

        {/* Countdown Badge */}
        {state === 'BETTING' && (
          <div className="flex items-center space-x-1.5 bg-amber-500/20 text-amber-300 border border-amber-500/50 px-3 py-1 rounded-full font-mono font-black text-sm animate-pulse">
            <Clock size={15} />
            <span>{timeLeft}s</span>
          </div>
        )}
      </div>

      {/* Main Plate and Bowl Stage */}
      <div className="relative w-64 h-64 sm:w-72 sm:h-72 flex items-center justify-center my-2">
        {/* Porcelain Plate (Đĩa sứ) */}
        <div className="absolute inset-0 rounded-full border-4 border-amber-500/60 bg-gradient-to-br from-amber-900/40 via-red-950 to-black shadow-2xl flex items-center justify-center p-3">
          <img
            src="/assets/dia.jpg"
            alt="Đĩa sứ"
            className="w-full h-full object-cover rounded-full opacity-80"
          />
        </div>

        {/* Dice Area (Displayed underneath the bowl when lifted or revealed) */}
        <div className="absolute z-10 flex items-center justify-center gap-3">
          {state === 'REVEALED' && diceResult ? (
            diceResult.map((sym, idx) => (
              <motion.div
                key={idx}
                initial={{ scale: 0, rotate: -30, y: 20 }}
                animate={{ scale: 1, rotate: 0, y: 0 }}
                transition={{
                  type: 'spring',
                  stiffness: 300,
                  damping: 18,
                  delay: idx * 0.15,
                }}
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-gradient-to-br from-amber-100 to-amber-300 p-1 shadow-gold-glow flex flex-col items-center justify-center border-2 border-amber-500"
              >
                <img
                  src={getSymbolImage(sym)}
                  alt={SYMBOLS[sym].nameVi}
                  className="w-12 h-12 sm:w-14 sm:h-14 object-cover rounded-lg shadow-inner"
                />
                <span className="text-[10px] font-black text-red-950 uppercase tracking-tighter">
                  {SYMBOLS[sym].nameVi}
                </span>
              </motion.div>
            ))
          ) : (
            <div className="w-14 h-14 rounded-full bg-amber-500/10 border border-amber-500/20 animate-pulse" />
          )}
        </div>

        {/* Shaking & Lifting Ceramic Bowl (Bát úp) */}
        <AnimatePresence>
          <motion.div
            className="absolute z-20 w-48 h-48 sm:w-56 sm:h-56 rounded-full flex items-center justify-center cursor-pointer select-none"
            animate={
              state === 'ROLLING'
                ? {
                    x: [0, -8, 8, -6, 6, -3, 3, 0],
                    y: [0, 6, -6, 4, -4, 2, -2, 0],
                    rotate: [0, -5, 5, -4, 4, -2, 2, 0],
                    transition: { repeat: Infinity, duration: 0.35, ease: 'easeInOut' },
                  }
                : state === 'REVEALED'
                ? {
                    y: -110,
                    opacity: 0.85,
                    scale: 0.9,
                    transition: { type: 'spring', stiffness: 200, damping: 15 },
                  }
                : {
                    y: 0,
                    opacity: 1,
                    scale: 1,
                    transition: { duration: 0.4 },
                  }
            }
          >
            <div className="relative w-full h-full rounded-full shadow-royal overflow-hidden border-2 border-amber-400/50">
              <img
                src="/assets/bat.jpg"
                alt="Bát úp Bầu Cua"
                className="w-full h-full object-cover rounded-full"
              />
              {/* Bowl Decorative Gilded Center */}
              <div className="absolute inset-0 bg-radial from-amber-400/20 via-transparent to-black/40 pointer-events-none rounded-full" />
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Host Controls & Action Buttons */}
      <div className="mt-2 flex items-center justify-center space-x-3 w-full">
        {isHost ? (
          <>
            {(state === 'WAITING' || state === 'REVEALED') && (
              <button
                onClick={() => {
                  sound.playChip();
                  onStartRound();
                }}
                className="flex items-center space-x-2 bg-gradient-to-r from-emerald-600 via-emerald-500 to-emerald-600 hover:from-emerald-500 hover:to-emerald-400 text-white font-extrabold px-6 py-2.5 rounded-full shadow-lg border border-emerald-300/40 transition active:scale-95 text-sm sm:text-base"
              >
                <Play size={18} fill="white" />
                <span>Bắt Đầu Cược (20s)</span>
              </button>
            )}

            {state === 'BETTING' && (
              <button
                onClick={() => {
                  sound.playChip();
                  onLockBetting();
                }}
                className="flex items-center space-x-2 bg-gradient-to-r from-red-600 via-amber-600 to-red-600 hover:from-red-500 hover:to-amber-500 text-white font-extrabold px-6 py-2.5 rounded-full shadow-lg border border-amber-300/40 transition active:scale-95 text-sm sm:text-base animate-pulse"
              >
                <Lock size={18} />
                <span>Khóa Cược & Xóc Ngay</span>
              </button>
            )}

            {state === 'ROLLING' && (
              <div className="flex items-center space-x-2 text-amber-300 text-sm font-bold bg-amber-500/10 px-4 py-2 rounded-full border border-amber-500/30">
                <Sparkles size={16} className="animate-spin text-amber-400" />
                <span>Đang lắc xúc xắc...</span>
              </div>
            )}
          </>
        ) : (
          <div className="text-xs sm:text-sm font-semibold text-amber-200/90 bg-red-950/70 border border-amber-500/30 px-4 py-2 rounded-full">
            {state === 'WAITING' && 'Đang đợi chủ phòng bắt đầu vòng mới...'}
            {state === 'BETTING' && 'Hãy chọn linh vật và đặt cược ngay!'}
            {state === 'ROLLING' && 'Bát đang xóc, chúc bạn may mắn!'}
            {state === 'REVEALED' && 'Vòng cược đã kết thúc, chuẩn bị ván mới.'}
          </div>
        )}
      </div>
    </div>
  );
};
