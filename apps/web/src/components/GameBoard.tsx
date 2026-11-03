'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ALL_SYMBOLS, BoardBetSummary, Player, Room, SYMBOLS, SymbolId } from '@bau-cua/types';
import { sound } from '@/lib/sound';

interface GameBoardProps {
  room: Room;
  currentPlayer: Player;
  boardSummary: BoardBetSummary[];
  onPlaceBet: (symbol: SymbolId, amount: number) => void;
}

const CHIP_VALUES = [10, 50, 100, 500];

export const GameBoard: React.FC<GameBoardProps> = ({
  room,
  currentPlayer,
  boardSummary,
  onPlaceBet,
}) => {
  const [selectedChip, setSelectedChip] = useState<number>(50);
  const isBetting = room.currentRound.state === 'BETTING';
  const diceResult = room.currentRound.diceResult;

  const getSummary = (symbol: SymbolId): BoardBetSummary => {
    return (
      boardSummary.find((s) => s.symbol === symbol) || {
        symbol,
        totalAmount: 0,
        playerCount: 0,
        myAmount: 0,
      }
    );
  };

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

  const getChipImage = (val: number) => {
    const map: Record<number, string> = {
      10: '/assets/chip_10.jpg',
      50: '/assets/chip_50.jpg',
      100: '/assets/chip_100.jpg',
      500: '/assets/chip_500.jpg',
    };
    return map[val] || '/assets/chip_10.jpg';
  };

  const handleCardClick = (symbol: SymbolId) => {
    if (!isBetting) return;
    if (currentPlayer.points < selectedChip) {
      alert('Bạn không đủ điểm để đặt mức cược này! Hãy nhấn dấu (+) ở góc trên để nạp thêm điểm miễn phí.');
      return;
    }
    sound.playChip();
    onPlaceBet(symbol, selectedChip);
  };

  return (
    <div className="w-full flex flex-col items-center max-w-4xl mx-auto my-3 px-2">
      {/* Chip Selector Bar */}
      <div className="flex items-center justify-center space-x-3 sm:space-x-6 py-2.5 px-4 mb-3 bg-black/60 rounded-full border border-amber-500/40 shadow-royal">
        <span className="text-xs sm:text-sm font-bold text-amber-200 hidden xs:inline">
          Chọn mệnh giá:
        </span>
        <div className="flex items-center space-x-2 sm:space-x-3">
          {CHIP_VALUES.map((val) => {
            const isSelected = selectedChip === val;
            return (
              <motion.button
                key={val}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  sound.playChip();
                  setSelectedChip(val);
                }}
                className={`relative flex items-center justify-center rounded-full transition ${
                  isSelected
                    ? 'ring-4 ring-amber-400 ring-offset-2 ring-offset-black scale-105'
                    : 'opacity-75 hover:opacity-100'
                }`}
              >
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full overflow-hidden shadow-lg border border-amber-300/60 bg-amber-900">
                  <img
                    src={getChipImage(val)}
                    alt={`Chip ${val}`}
                    className="w-full h-full object-cover"
                  />
                </div>
                <span className="absolute text-[11px] sm:text-xs font-black text-amber-100 drop-shadow-[0_1.5px_1.5px_rgba(0,0,0,0.9)]">
                  {val}
                </span>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* 6 Animals Grid (2 rows x 3 columns on tablet/desktop, 2x3 responsive) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-4 w-full">
        {ALL_SYMBOLS.map((symbol) => {
          const meta = SYMBOLS[symbol];
          const summary = getSummary(symbol);
          const isWinning =
            room.currentRound.state === 'REVEALED' &&
            diceResult &&
            diceResult.includes(symbol);
          const winningCount =
            diceResult ? diceResult.filter((d) => d === symbol).length : 0;

          return (
            <motion.div
              key={symbol}
              whileHover={isBetting ? { scale: 1.02 } : {}}
              whileTap={isBetting ? { scale: 0.97 } : {}}
              onClick={() => handleCardClick(symbol)}
              className={`relative flex flex-col items-center justify-between p-2.5 sm:p-3 rounded-2xl border-2 transition-all cursor-pointer select-none overflow-hidden ${
                isWinning
                  ? 'border-amber-400 bg-gradient-to-b from-amber-600/30 to-red-950 shadow-gold-glow animate-pulse-glow'
                  : 'border-amber-700/50 hover:border-amber-400/80 bg-gradient-to-b from-red-950/80 via-tet-card to-black/80'
              } ${!isBetting ? 'cursor-not-allowed opacity-90' : 'hover:shadow-royal'}`}
            >
              {/* Winning Star Badge */}
              {isWinning && (
                <div className="absolute top-1.5 right-1.5 z-20 bg-amber-400 text-red-950 text-[10px] font-black px-2 py-0.5 rounded-full shadow-lg border border-amber-200">
                  x{winningCount} TRÚNG!
                </div>
              )}

              {/* Title Header */}
              <div className="w-full flex items-center justify-between mb-1">
                <span className="text-xs sm:text-sm font-black tracking-wider uppercase text-amber-300">
                  {meta.nameVi}
                </span>
                {summary.myAmount > 0 && (
                  <span className="bg-emerald-600 text-white text-[10px] sm:text-xs font-black px-2 py-0.5 rounded-full shadow border border-emerald-400/60">
                    Cược: {summary.myAmount}
                  </span>
                )}
              </div>

              {/* 3D Mascot Image */}
              <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-xl overflow-hidden my-1 shadow-inner border border-amber-500/30 bg-black/40">
                <img
                  src={getSymbolImage(symbol)}
                  alt={meta.nameVi}
                  className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                />
              </div>

              {/* Bet Amount Details Footer */}
              <div className="w-full flex items-center justify-between mt-1 text-[11px] text-amber-200/80 bg-black/50 px-2 py-1 rounded-lg border border-amber-900/40">
                <span>Tổng cược:</span>
                <span className="font-extrabold text-amber-400">
                  {summary.totalAmount > 0 ? summary.totalAmount.toLocaleString() : '0'}
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
