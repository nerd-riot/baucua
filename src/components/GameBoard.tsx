'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ALL_SYMBOLS, BoardBetSummary, Player, Room, SYMBOLS, SymbolId } from '@/types';
import { sound } from '@/lib/sound';
import { Sparkles, Zap, Users, X, Crown, RotateCcw } from 'lucide-react';

interface GameBoardProps {
  room: Room;
  currentPlayer: Player;
  boardSummary: BoardBetSummary[];
  onPlaceBet: (symbol: SymbolId, amount: number) => void;
  onCancelBets?: (symbol?: SymbolId) => void;
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
  onCancelBets,
}) => {
  const [selectedChip, setSelectedChip] = useState<number>(50);
  const [selectedBettorsSymbol, setSelectedBettorsSymbol] = useState<SymbolId | null>(null);
  const isPlayerDealer = room.dealerType === 'player' && room.hostId === currentPlayer.id;
  const isBetting = room.currentRound.state === 'BETTING' && !isPlayerDealer;
  const diceResult = room.currentRound.diceResult;
  const totalBoardBets = boardSummary.reduce((sum, item) => sum + item.totalAmount, 0);
  const getSummary = (symbol: SymbolId): BoardBetSummary => {
    const found = boardSummary.find((s) => s.symbol === symbol);
    if (!found) {
      return {
        symbol,
        totalAmount: 0,
        playerCount: 0,
        myAmount: 0,
        bettors: [],
      };
    }
    const myBetFromBettors = found.bettors?.find((b) => b.playerId === currentPlayer.id)?.amount;
    return {
      ...found,
      myAmount: myBetFromBettors !== undefined ? myBetFromBettors : found.myAmount,
    };
  };

  const myTotalBets = ALL_SYMBOLS.reduce((sum, sym) => sum + getSummary(sym).myAmount, 0);

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
    if (isPlayerDealer) {
      const summary = getSummary(symbol);
      if (summary.playerCount > 0) {
        sound.playChip();
        setSelectedBettorsSymbol(selectedBettorsSymbol === symbol ? null : symbol);
      }
      return;
    }
    if (!isBetting) return;
    sound.playChip();
    onPlaceBet(symbol, selectedChip);
  };

  return (
    <div className="w-full flex flex-col items-center flex-1 min-h-0 select-none overflow-hidden">
      {/* Chip Selector Bar or Dealer Info Banner */}
      {isPlayerDealer ? (
        <div className="flex flex-wrap items-center justify-center gap-2 py-2 px-4 mb-1.5 bg-gradient-to-r from-amber-950/90 via-red-950/90 to-amber-950/90 rounded-full border border-amber-400/60 shadow-royal shrink-0 text-xs">
          <span className="font-black text-amber-300 flex items-center gap-1">
            <Crown size={14} className="text-amber-400" />
            Bạn đang làm Nhà Cái:
          </span>
          <span className="text-amber-100/90 font-semibold">
            Ăn tiền người thua & trả thưởng người thắng từ quỹ điểm của bạn
          </span>
          <span className="bg-black/60 text-amber-300 font-mono font-black px-2.5 py-0.5 rounded-full border border-amber-500/40">
            Làng đặt: {totalBoardBets.toLocaleString()} pts
          </span>
        </div>
      ) : (
        <div className="flex items-center justify-center space-x-2.5 sm:space-x-4 py-1.5 px-3.5 mb-1.5 bg-black/60 rounded-full border border-amber-500/40 shadow-royal shrink-0">
          <span className="text-xs font-bold text-amber-200 hidden xs:inline">
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
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full overflow-hidden shadow-lg border border-amber-300/60 bg-amber-900">
                    <img
                      src={getChipImage(val)}
                      alt={`Chip ${val}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <span className="absolute text-[10px] sm:text-[11px] font-black text-amber-100 drop-shadow-[0_1.5px_1.5px_rgba(0,0,0,0.9)]">
                    {val}
                  </span>
                </motion.button>
              );
            })}
          </div>

          {isBetting && myTotalBets > 0 && onCancelBets && (
            <button
              type="button"
              onClick={() => {
                sound.playChip();
                onCancelBets();
              }}
              className="flex items-center gap-1 bg-red-800/90 hover:bg-red-700 text-amber-100 border border-amber-400/50 px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-black shadow transition active:scale-95 ml-1"
              title="Rút lại toàn bộ điểm đã đặt cược trên bàn"
            >
              <RotateCcw size={12} />
              <span>Rút hết ({myTotalBets})</span>
            </button>
          )}
        </div>
      )}

      {/* 6 Animals Grid (2 rows x 3 columns) - Fills Available Height */}
      <div className="grid grid-cols-3 gap-1.5 sm:gap-2.5 w-full flex-1 min-h-0">
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
              whileHover={isBetting ? { scale: 1.02 } : {}}
              whileTap={isBetting ? { scale: 0.97 } : {}}
              onClick={() => handleCardClick(symbol)}
              className={`relative flex flex-col items-center justify-between p-1.5 sm:p-2 rounded-2xl border-2 transition-all cursor-pointer select-none overflow-hidden h-full ${
                isNeonActive
                  ? 'border-yellow-300 ring-4 ring-amber-400 bg-gradient-to-b from-amber-500/35 via-red-950 to-amber-950/50 shadow-[0_0_35px_rgba(245,158,11,1),inset_0_0_20px_rgba(245,158,11,0.5)] scale-105 z-20'
                  : isWinning
                  ? 'border-amber-400 bg-gradient-to-b from-amber-600/30 to-red-950 shadow-gold-glow animate-pulse-glow'
                  : 'border-amber-700/50 hover:border-amber-400/80 bg-gradient-to-b from-red-950/85 via-tet-card to-black/85'
              } ${!isBetting ? 'cursor-not-allowed opacity-90' : 'hover:shadow-royal'}`}
            >
              {/* Neon Border Chase Active Runner Badge */}
              {isChasing && (
                <div className="absolute top-1 left-1 z-30 bg-amber-400 text-red-950 text-[8px] sm:text-[9px] font-black px-1.5 py-0.2 rounded-full shadow-lg flex items-center gap-0.5 animate-bounce">
                  <Zap size={10} fill="currentColor" />
                  <span>CƯỢC MỞ!</span>
                </div>
              )}

              {/* Winning Star Badge */}
              {isWinning && (
                <div className="absolute top-1 right-1 z-20 bg-amber-400 text-red-950 text-[9px] sm:text-[10px] font-black px-1.5 py-0.2 rounded-full shadow-lg border border-amber-200">
                  x{winningCount} TRÚNG!
                </div>
              )}

              {/* Title Header */}
              <div className="w-full flex items-center justify-between mb-0.5 px-0.5 shrink-0 gap-1">
                <span className="text-[11px] sm:text-xs md:text-sm font-black tracking-wider uppercase text-amber-300 flex items-center gap-1">
                  {meta.nameVi}
                </span>
                {summary.myAmount > 0 && (
                  <div className="flex items-center gap-1 z-30">
                    <span className="bg-emerald-600 text-white text-[9px] sm:text-[11px] font-black px-2 py-0.5 rounded-full shadow border border-emerald-300/80">
                      Bạn đặt: {summary.myAmount}
                    </span>
                    {isBetting && onCancelBets && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          sound.playChip();
                          onCancelBets(symbol);
                        }}
                        className="bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white text-[9px] sm:text-[11px] font-black px-2 py-0.5 rounded-full shadow-lg border border-amber-200 flex items-center gap-1 transition active:scale-90 cursor-pointer"
                        title={`Rút lại ${summary.myAmount} điểm cược ô ${meta.nameVi}`}
                      >
                        <RotateCcw size={10} />
                        <span>Rút lại</span>
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* 3D Mascot Image - Dedicated Square Frame, Never Stretched Horizontally! */}
              <div className="flex-1 min-h-0 w-full flex items-center justify-center my-0.5 overflow-hidden">
                <div className="relative h-full aspect-square max-h-full max-w-full rounded-2xl overflow-hidden shadow-md border-2 border-amber-400/50 bg-gradient-to-br from-amber-50 via-white to-amber-100 p-1 flex items-center justify-center">
                  <img
                    src={getSymbolImage(symbol)}
                    alt={meta.nameVi}
                    className="w-full h-full object-contain rounded-xl transition-transform duration-300 hover:scale-108 select-none pointer-events-none drop-shadow"
                  />
                </div>
              </div>

              {/* Bet Amount Details Footer & Bettor Breakdown Trigger */}
              <div className="w-full flex items-center justify-between mt-0.5 text-[10px] sm:text-[11px] text-amber-200/80 bg-black/60 px-1.5 py-0.5 rounded-lg border border-amber-900/50 shrink-0 relative">
                <div className="flex items-center gap-1 min-w-0">
                  <span className="text-[10px] text-amber-300/70">Tổng:</span>
                  <span className="font-black text-amber-300 font-mono text-[10px] sm:text-[11px]">
                    {summary.totalAmount > 0 ? summary.totalAmount.toLocaleString() : '0'}
                  </span>
                </div>

                {/* Bettors Count & Click to View Breakdown */}
                {summary.playerCount > 0 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      sound.playChip();
                      setSelectedBettorsSymbol(selectedBettorsSymbol === symbol ? null : symbol);
                    }}
                    className="flex items-center space-x-1 bg-amber-500/20 hover:bg-amber-500/40 text-amber-300 px-1.5 py-0.5 rounded border border-amber-500/40 font-bold transition active:scale-95 text-[9px] sm:text-[10px] shrink-0"
                    title="Xem chi tiết người cược"
                  >
                    <div className="flex -space-x-1 overflow-hidden shrink-0">
                      {summary.bettors?.slice(0, 2).map((b) => (
                        <img
                          key={b.playerId}
                          src={`/assets/02_characters/${b.avatarId}.png`}
                          alt={b.nickname}
                          className="w-3.5 h-3.5 rounded-full object-cover border border-amber-300 inline-block"
                        />
                      ))}
                    </div>
                    <span>{summary.playerCount} người</span>
                  </button>
                )}
              </div>

              {/* Bettors Breakdown Popover */}
              <AnimatePresence>
                {selectedBettorsSymbol === symbol && summary.bettors && summary.bettors.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 10 }}
                    onClick={(e) => e.stopPropagation()}
                    className="absolute inset-x-1 bottom-1 z-40 bg-gradient-to-b from-red-950/98 via-tet-card to-black/98 backdrop-blur-md rounded-xl border-2 border-amber-400 p-2 shadow-2xl max-h-44 flex flex-col"
                  >
                    <div className="flex items-center justify-between pb-1 mb-1 border-b border-amber-500/30">
                      <span className="text-[10px] font-black text-amber-300 uppercase flex items-center gap-1">
                        <Users size={12} className="text-amber-400" />
                        Cược {meta.nameVi} ({summary.playerCount} người)
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedBettorsSymbol(null);
                        }}
                        className="text-amber-400/80 hover:text-amber-200 p-0.5 rounded hover:bg-white/10"
                      >
                        <X size={12} />
                      </button>
                    </div>

                    <div className="flex flex-col space-y-1 overflow-y-auto custom-scrollbar pr-0.5">
                      {summary.bettors.map((b) => {
                        const isThisMe = b.playerId === currentPlayer.id;
                        return (
                          <div
                            key={b.playerId}
                            className={`flex items-center justify-between px-1.5 py-1 rounded text-[10px] ${
                              isThisMe
                                ? 'bg-amber-500/25 border border-amber-400/60 font-bold'
                                : 'bg-black/50 border border-amber-900/40'
                            }`}
                          >
                            <div className="flex items-center gap-1.5 min-w-0">
                              <img
                                src={`/assets/02_characters/${b.avatarId}.png`}
                                alt={b.nickname}
                                className="w-4 h-4 rounded-full object-cover border border-amber-300/70 shrink-0"
                              />
                              <span className="text-amber-100 truncate max-w-[85px] sm:max-w-[110px]">
                                {b.nickname} {isThisMe && '(Bạn)'}
                              </span>
                            </div>
                            <span className="font-mono font-black text-amber-300 shrink-0">
                              {b.amount.toLocaleString()} pts
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
