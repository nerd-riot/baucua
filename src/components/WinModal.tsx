'use client';

import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'framer-motion';
import { PlayerSettlement, Round, SYMBOLS, SymbolId } from '@/types';
import { sound } from '@/lib/sound';
import { Trophy, Award, X } from 'lucide-react';

interface WinModalProps {
  round: Round;
  currentUserId: string;
  onClose: () => void;
}

export const WinModal: React.FC<WinModalProps> = ({
  round,
  currentUserId,
  onClose,
}) => {
  const settlements = round.settlements || [];
  const mySettlement: PlayerSettlement | undefined = settlements.find(
    (s) => s.playerId === currentUserId
  );

  const hasWon = mySettlement && mySettlement.netProfit > 0;

  useEffect(() => {
    if (hasWon) {
      sound.playWin();
      // Trigger festive fireworks
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#f59e0b', '#ef4444', '#10b981', '#fef08a'],
        });
      } catch {}
    }
  }, [hasWon]);

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
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
        <motion.div
          initial={{ scale: 0.8, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.8, opacity: 0, y: 20 }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          className="relative w-full max-w-md bg-gradient-to-b from-red-950 via-tet-card to-black rounded-3xl border-2 border-amber-400 p-6 shadow-royal text-center overflow-hidden"
        >
          {/* Close button in top-right */}
          <button
            onClick={() => {
              sound.playChip();
              onClose();
            }}
            className="absolute top-4 right-4 text-amber-400/70 hover:text-amber-200 p-1.5 rounded-full hover:bg-white/10 transition active:scale-95"
            aria-label="Đóng"
          >
            <X size={20} />
          </button>
          {/* Header Graphic / Icon */}
          <div className="flex justify-center mb-3">
            {hasWon ? (
              <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-300 p-3 shadow-gold-glow flex items-center justify-center animate-bounce">
                <Trophy size={36} className="text-red-950" />
              </div>
            ) : (
              <div className="w-14 h-14 rounded-full bg-red-900/60 p-3 border border-amber-500/40 flex items-center justify-center">
                <Award size={32} className="text-amber-400" />
              </div>
            )}
          </div>

          {/* Title */}
          <h2 className="text-xl sm:text-2xl font-black text-gold-gradient uppercase tracking-wide">
            {hasWon ? 'Chúc Mừng Chiến Thắng!' : 'Kết Quả Ván Đấu'}
          </h2>

          {/* Rolled Dice Showcase */}
          {round.diceResult && (
            <div className="flex items-center justify-center gap-3 my-4">
              {round.diceResult.map((sym, idx) => (
                <div
                  key={idx}
                  className="flex flex-col items-center bg-black/50 p-2 rounded-xl border border-amber-500/40 shadow-inner"
                >
                  <img
                    src={getSymbolImage(sym)}
                    alt={SYMBOLS[sym].nameVi}
                    className="w-12 h-12 object-cover rounded-lg"
                  />
                  <span className="text-[10px] font-black text-amber-300 mt-1 uppercase">
                    {SYMBOLS[sym].nameVi}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Profit Breakdown if bet placed */}
          {mySettlement ? (
            <div className="bg-black/40 rounded-2xl border border-amber-500/30 p-3 my-3 space-y-1.5 text-xs sm:text-sm">
              <div className="flex justify-between text-amber-200/80">
                <span>Tổng cược:</span>
                <span className="font-bold text-amber-100">
                  {mySettlement.totalBet.toLocaleString()} pts
                </span>
              </div>
              <div className="flex justify-between text-amber-200/80">
                <span>Tổng nhận lại (Gross):</span>
                <span className="font-bold text-emerald-400">
                  +{mySettlement.grossPayout.toLocaleString()} pts
                </span>
              </div>
              <div className="flex justify-between border-t border-amber-500/20 pt-1.5 font-bold">
                <span className="text-amber-300">Lãi ròng (Net Profit):</span>
                <span
                  className={
                    mySettlement.netProfit > 0
                      ? 'text-emerald-400 font-extrabold text-base'
                      : 'text-red-400 font-semibold'
                  }
                >
                  {mySettlement.netProfit > 0 ? '+' : ''}
                  {mySettlement.netProfit.toLocaleString()} pts
                </span>
              </div>
            </div>
          ) : (
            <p className="text-xs text-amber-300/70 my-3">
              Bạn chưa tham gia đặt cược trong ván này.
            </p>
          )}

          {/* Close / Continue Button */}
          <button
            onClick={() => {
              sound.playChip();
              onClose();
            }}
            className="w-full mt-2 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-yellow-300 text-red-950 font-black py-2.5 rounded-xl shadow-lg transition active:scale-95 text-sm sm:text-base uppercase tracking-wider"
          >
            Tiếp Tục Chơi
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
