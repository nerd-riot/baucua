'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { ALL_SYMBOLS, BoardBetSummary, Player, Room, SYMBOLS, SymbolId } from '@/types';
import { sound } from '@/lib/sound';
import { Sparkles, Zap } from 'lucide-react';

interface GameBoardProps {
  room: Room;
  currentPlayer: Player;
  boardSummary: BoardBetSummary[];
  onPlaceBet: (symbol: SymbolId, amount: number) => void;
}

const CHIP_VALUES = [10, 50, 100, 500];

// Clockwise perimeter order around the 2x3 board grid:
// Top row: BAU (0) -> CUA (1) -> TOM (2)
// Bottom row: NAI (5) -> GA (4) -> CA (3) -> (back to BAU)
const CHASE_ORDER: SymbolId[] = [
  SymbolId.BAU, // Top-Left
  SymbolId.CUA, // Top-Center
  SymbolId.TOM, // Top-Right
  SymbolId.NAI, // Bottom-Right
  SymbolId.GA,  // Bottom-Center
  SymbolId.CA,  // Bottom-Left
];

export const GameBoard: React.FC<GameBoardProps> = ({
  room,
  currentPlayer,
  boardSummary,
  onPlaceBet,
}) => {
  const [selectedChip, setSelectedChip] = useState<number>(50);
  const isBetting = room.currentRound.state === 'BETTING';
  const diceResult = room.currentRound.diceResult;

  // Neon Border Chase state
  const [activeChaseSymbol, setActiveChaseSymbol] = useState<SymbolId | null>(null);
  const [isAllNeonFlash, setIsAllNeonFlash] = useState<boolean>(false);
  const prevRoundIdRef = useRef<string | null>(null);

  // Trigger border chase neon effect whenever a round starts BETTING
  useEffect(() => {
    const round = room.currentRound;
    if (round.state === 'BETTING' && round.id !== prevRoundIdRef.current) {
      prevRoundIdRef.current = round.id;

      let step = 0;
      const totalSteps = 18; // 3 full perimeter laps
      const stepDuration = 95; // 95ms per card hop

      const interval = setInterval(() => {
        if (step < totalSteps) {
          const currentSym = CHASE_ORDER[step % CHASE_ORDER.length];
          setActiveChaseSymbol(currentSym);
          sound.playTick();
          step++;
        } else {
          clearInterval(interval);
          setActiveChaseSymbol(null);
          // Flash all 6 cards together in celebration
          setIsAllNeonFlash(true);
          sound.playChip();
          setTimeout(() => {
            setIsAllNeonFlash(false);
          }, 450);
        }
      }, stepDuration);

      return () => clearInterval(interval);
    }
  }, [room.currentRound.id, room.currentRound.state]);

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
    return map[id] || '/assets/bau.jpg';
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
    <div className="w-full flex flex-col items-center max-w-4xl mx-auto my-3 px-2 select-none">
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

      {/* 6 Animals Grid (2 rows x 3 columns) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4.5 w-full">
        {ALL_SYMBOLS.map((symbol) => {
          const meta = SYMBOLS[symbol];
          const summary = getSummary(symbol);
          const isWinning =
            room.currentRound.state === 'REVEALED' &&
            diceResult &&
            diceResult.includes(symbol);
          const winningCount =
            diceResult ? diceResult.filter((d) => d === symbol).length : 0;

          // Check if this card has active neon border chase
          const isChasing = activeChaseSymbol === symbol;
          const isNeonActive = isChasing || isAllNeonFlash;

          return (
            <motion.div
              key={symbol}
              whileHover={isBetting ? { scale: 1.025 } : {}}
              whileTap={isBetting ? { scale: 0.97 } : {}}
              onClick={() => handleCardClick(symbol)}
              className={`relative flex flex-col items-center justify-between p-3 sm:p-3.5 rounded-2xl border-2 transition-all cursor-pointer select-none overflow-hidden ${
                isNeonActive
                  ? 'border-yellow-300 ring-4 ring-amber-400 bg-gradient-to-b from-amber-500/35 via-red-950 to-amber-950/50 shadow-[0_0_35px_rgba(245,158,11,1),inset_0_0_20px_rgba(245,158,11,0.5)] scale-105 z-20'
                  : isWinning
                  ? 'border-amber-400 bg-gradient-to-b from-amber-600/30 to-red-950 shadow-gold-glow animate-pulse-glow'
                  : 'border-amber-700/50 hover:border-amber-400/80 bg-gradient-to-b from-red-950/85 via-tet-card to-black/85'
              } ${!isBetting ? 'cursor-not-allowed opacity-90' : 'hover:shadow-royal'}`}
            >
              {/* Neon Border Chase Active Runner Badge */}
              {isChasing && (
                <div className="absolute top-1.5 left-1.5 z-30 bg-amber-400 text-red-950 text-[9px] font-black px-2 py-0.5 rounded-full shadow-lg flex items-center gap-0.5 animate-bounce">
                  <Zap size={11} fill="currentColor" />
                  <span>CƯỢC MỞ!</span>
                </div>
              )}

              {/* Winning Star Badge */}
              {isWinning && (
                <div className="absolute top-1.5 right-1.5 z-20 bg-amber-400 text-red-950 text-[10px] font-black px-2 py-0.5 rounded-full shadow-lg border border-amber-200">
                  x{winningCount} TRÚNG!
                </div>
              )}

              {/* Title Header */}
              <div className="w-full flex items-center justify-between mb-1 px-0.5">
                <span className="text-xs sm:text-sm font-black tracking-wider uppercase text-amber-300 flex items-center gap-1">
                  {meta.nameVi}
                </span>
                {summary.myAmount > 0 && (
                  <span className="bg-emerald-600 text-white text-[10px] sm:text-xs font-black px-2 py-0.5 rounded-full shadow border border-emerald-400/60">
                    Cược: {summary.myAmount}
                  </span>
                )}
              </div>

              {/* 3D Mascot Image - Large, Gilded Porcelain Card Frame */}
              <div className="relative w-full aspect-square max-w-[170px] sm:max-w-[210px] rounded-2xl overflow-hidden my-1.5 shadow-[0_8px_18px_rgba(0,0,0,0.7)] border-2 border-amber-400/60 bg-gradient-to-br from-amber-100 via-white to-amber-200 p-1.5">
                <img
                  src={getSymbolImage(symbol)}
                  alt={meta.nameVi}
                  className="w-full h-full object-cover rounded-xl transition-transform duration-300 hover:scale-108"
                />
              </div>

              {/* Bet Amount Details Footer */}
              <div className="w-full flex items-center justify-between mt-1 text-[11px] text-amber-200/80 bg-black/60 px-2.5 py-1.5 rounded-xl border border-amber-900/50">
                <span>Tổng cược:</span>
                <span className="font-black text-amber-300 font-mono">
                  {summary.totalAmount > 0 ? summary.totalAmount.toLocaleString() : '0'} pts
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
