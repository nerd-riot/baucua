'use client';

import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { DiceResult, Player, Room, RoundState, SYMBOLS, SymbolId } from '@/types';
import { sound } from '@/lib/sound';
import { Play, Lock, Sparkles, Clock, Flame, Eye } from 'lucide-react';

interface DiceShakerProps {
  room: Room;
  currentPlayer: Player;
  onStartRound: () => void;
  onLockBetting: () => void;
  onShowResultModal?: () => void;
}

const TROLL_SUSPENSE_QUOTES = [
  "Bát này thề không bịp! Bịp thì... làm ván nữa! 🎲",
  "Tay run bần bật... Ai rồi cũng phải ra đê hoặc lên mây! 🚀",
  "Xóc bay nóc nhà! Ai cược Cua chuẩn bị tinh thần kẹp tay! 🦀",
  "Đang lắc 720 vòng... Xem ai gáy to nhất sới hôm nay! 🔥",
  "Hít sâu thở đều! Cầu trời khấn Phật xin con Bầu con Cá! 🙏",
  "Nín thở 3 giây... Quẻ này lành ít dữ nhiều rồi các con bạc! 💀",
  "Nghe tiếng lách cách là biết sắp có người khóc thét! 💸",
  "Bình tĩnh không quạu! Nhà cái đang xóc bằng cả tính mạng! 💥",
  "Mở ra không trúng thì đổ tại phong thủy, đừng đổ tại tôi! 🌪️",
  "Xóc nhiệt tình, lắc hết mình! Ra ba con Tôm là cười ỉa! 🦐",
  "Đang niệm chú 'Tất tay không hối hận'... Bát này căng đét! ⚡",
  "Chuẩn bị khăn giấy lau nước mắt hoặc bao tải đựng tiền! 💰",
  "Lắc long trời lở đất! Thần rùa hiển linh độ tôi ván này! 🐢",
  "Ủa ai cược Gà dữ vậy? Coi chừng thành Gà luộc cúng Tết nha! 🐔",
  "Tiền trong túi là tiền giấy, vào tay nhà cái mới là tiền tươi! 💵",
  "Nhắm mắt cầu nguyện đi! Mở bát là biết ai làm đại gia! 👑",
  "Phen này trúng Bầu thì đổi đời, trượt thì đổi chỗ ngủ! 🏕️",
  "Lắc đều tay không thiên vị! Tổ nghề Bầu Cua đang độ ai đây? 🎯",
];

export const DiceShaker: React.FC<DiceShakerProps> = ({
  room,
  currentPlayer,
  onStartRound,
  onLockBetting,
  onShowResultModal,
}) => {
  const currentRound = room.currentRound;
  const isHost = room.hostId === currentPlayer.id;
  const state: RoundState = currentRound.state;
  const diceResult: DiceResult | undefined = currentRound.diceResult;

  const [timeLeft, setTimeLeft] = useState<number>(0);
  const autoLockTriggeredRef = useRef(false);
  const [trollQuote, setTrollQuote] = useState<string>(() => {
    return TROLL_SUSPENSE_QUOTES[Math.floor(Math.random() * TROLL_SUSPENSE_QUOTES.length)];
  });

  // Cycle troll suspense quotes rapidly every 1.2s during ROLLING state
  useEffect(() => {
    if (state === 'ROLLING') {
      setTrollQuote(TROLL_SUSPENSE_QUOTES[Math.floor(Math.random() * TROLL_SUSPENSE_QUOTES.length)]);
      const interval = setInterval(() => {
        setTrollQuote((prev) => {
          let next = prev;
          while (next === prev) {
            next = TROLL_SUSPENSE_QUOTES[Math.floor(Math.random() * TROLL_SUSPENSE_QUOTES.length)];
          }
          return next;
        });
      }, 1200);

      return () => clearInterval(interval);
    }
  }, [state]);

  // Reset autoLock flag on new round
  useEffect(() => {
    if (state === 'BETTING') {
      autoLockTriggeredRef.current = false;
    }
  }, [state, currentRound.id]);

  // Countdown timer calculation + count_down_time_up sound when 3-4s remain
  useEffect(() => {
    if (state !== 'BETTING' || !currentRound.bettingEndsAt) {
      setTimeLeft(0);
      return;
    }

    const interval = setInterval(() => {
      const remainingMs = Math.max(0, currentRound.bettingEndsAt! - Date.now());
      const seconds = Math.ceil(remainingMs / 1000);
      setTimeLeft(seconds);

      // Play dramatic countdown time up effect when 3s remain
      if (seconds === 3) {
        sound.playCountDownTimeUp();
      } else if (seconds < 3 && seconds > 0) {
        sound.playTick();
      }

      // Auto lock betting when time expires
      if (remainingMs <= 0 && isHost && !autoLockTriggeredRef.current) {
        autoLockTriggeredRef.current = true;
        onLockBetting();
      }
    }, 400);

    return () => clearInterval(interval);
  }, [state, currentRound.bettingEndsAt, isHost, onLockBetting]);

  // Handle ROLLING state: Play looping shake.mp3 sound + countdown time up climax
  useEffect(() => {
    if (state === 'ROLLING') {
      sound.startShake();
      // Trigger dramatic count down time up sound 3.4s before reveal
      const tCountdown = setTimeout(() => {
        sound.playCountDownTimeUp();
      }, 400);

      return () => {
        sound.stopShake();
        sound.stopCountDownTimeUp();
        clearTimeout(tCountdown);
      };
    } else {
      sound.stopShake();
      sound.stopCountDownTimeUp();
    }
  }, [state]);

  // Handle REVEALED state: Bowl reveal sound, staggered dice clicks & subtle firework
  useEffect(() => {
    if (state === 'REVEALED' && diceResult) {
      sound.playBowlOpen();

      const t1 = setTimeout(() => sound.playDiceLand(), 220);
      const t2 = setTimeout(() => sound.playDiceLand(), 500);
      const t3 = setTimeout(() => sound.playDiceLand(), 780);

      // Subtle celebration sparkle (refined, doesn't obscure screen)
      const tFire = setTimeout(() => {
        sound.playFireworkBurst();
        try {
          confetti({
            particleCount: 26,
            spread: 48,
            origin: { y: 0.6 },
            scalar: 0.85,
            colors: ['#f59e0b', '#ef4444', '#10b981', '#fef08a'],
          });
        } catch {}
      }, 880);

      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
        clearTimeout(tFire);
      };
    }
  }, [state, diceResult]);

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

  return (
    <div className="relative flex flex-col items-center justify-center p-3 sm:p-3.5 bg-gradient-to-b from-red-950/95 via-tet-card to-black/95 rounded-2xl border-2 border-amber-500/40 shadow-royal overflow-hidden w-full select-none shrink-0">
      {/* Decorative festive corners */}
      <div className="absolute top-2 left-2 text-amber-500/40 text-[10px]">❖</div>
      <div className="absolute top-2 right-2 text-amber-500/40 text-[10px]">❖</div>
      <div className="absolute bottom-2 left-2 text-amber-500/40 text-[10px]">❖</div>
      <div className="absolute bottom-2 right-2 text-amber-500/40 text-[10px]">❖</div>

      {/* Header Status Bar (Clean: Only Round # and Status & Countdown timer) */}
      <div className="flex items-center justify-between w-full mb-1 px-1">
        <div className="flex items-center space-x-2">
          <span className="text-xs uppercase tracking-wider font-extrabold text-amber-300 bg-red-900/80 px-2.5 py-0.5 rounded-full border border-amber-500/40 shadow-sm">
            Ván #{currentRound.roundNumber}
          </span>
          <span className="text-xs font-bold text-amber-100 flex items-center gap-1">
            {state === 'WAITING' && '🏮 Chờ ván mới'}
            {state === 'BETTING' && '🔥 Đang đặt cược...'}
            {state === 'ROLLING' && '⚡ Đang xóc đĩa...'}
            {state === 'REVEALED' && '✨ Đã mở bát!'}
          </span>
        </div>

        {/* Countdown Badge */}
        {state === 'BETTING' && (
          <div className="flex items-center space-x-1.5 bg-amber-500/20 text-amber-300 border border-amber-500/60 px-2.5 py-0.5 rounded-full font-mono font-black text-xs shadow-gold-glow animate-pulse">
            <Clock size={14} />
            <span>{timeLeft}s</span>
          </div>
        )}
      </div>

      {/* Main Plate and Bowl Stage with Compact Height for Zero-Scroll Layout */}
      <div
        className="relative w-44 h-44 sm:w-52 sm:h-52 flex items-center justify-center my-1"
        style={{ perspective: 1200 }}
      >
        {/* Shaking vibration shockwave aura around the plate */}
        {state === 'ROLLING' && (
          <motion.div
            animate={{
              scale: [0.96, 1.06, 0.96],
              opacity: [0.3, 0.75, 0.3],
            }}
            transition={{ repeat: Infinity, duration: 0.5, ease: 'easeInOut' }}
            className="absolute inset-0 rounded-full border-2 border-amber-400/80 shadow-[0_0_25px_rgba(245,158,11,0.7)] pointer-events-none"
          />
        )}

        {/* Porcelain Plate (Đĩa sứ truyền thống) */}
        <div className="absolute inset-0 rounded-full border-4 border-amber-500/60 bg-gradient-to-br from-amber-950/60 via-red-950 to-black shadow-2xl flex items-center justify-center p-2.5 overflow-hidden">
          <img
            src="/assets/dia.jpg"
            alt="Đĩa sứ"
            className="w-full h-full object-cover rounded-full opacity-85 select-none pointer-events-none"
          />

          {/* Golden Divine Sunburst Light Burst Underneath Revealed Bowl */}
          {state === 'REVEALED' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.2, rotate: 0 }}
              animate={{
                opacity: [0, 0.85, 0.5],
                scale: [0.2, 1.35, 1.15],
                rotate: 180,
              }}
              transition={{ duration: 2.2, ease: 'easeOut' }}
              className="absolute inset-2 pointer-events-none rounded-full bg-radial from-amber-300/40 via-amber-500/20 to-transparent blur-md"
            />
          )}
        </div>

        {/* 3 Rolled Dice with 3D Tumble and Bounce Animation */}
        <div className="absolute z-10 flex items-center justify-center gap-2">
          {state === 'REVEALED' && diceResult ? (
            diceResult.map((sym, idx) => {
              const delays = [0.2, 0.48, 0.76];
              const rotations = [-8, 4, -5];
              return (
                <motion.div
                  key={`${sym}-${idx}`}
                  initial={{
                    scale: 0,
                    rotateX: 720 * (idx % 2 === 0 ? 1 : -1),
                    rotateY: 540 * (idx % 2 === 0 ? -1 : 1),
                    rotateZ: 360,
                    y: -70,
                    opacity: 0,
                  }}
                  animate={{
                    scale: 1,
                    rotateX: 0,
                    rotateY: 0,
                    rotateZ: rotations[idx],
                    y: 0,
                    opacity: 1,
                  }}
                  transition={{
                    type: 'spring',
                    stiffness: 280,
                    damping: 14,
                    delay: delays[idx],
                  }}
                  className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-gradient-to-br from-amber-100 via-white to-amber-200 p-1 shadow-[0_8px_18px_rgba(0,0,0,0.8),0_0_15px_rgba(245,158,11,0.6)] flex flex-col items-center justify-between border border-amber-400"
                >
                  <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-lg overflow-hidden shadow-inner border border-amber-400/50 bg-black/10">
                    <img
                      src={getSymbolImage(sym)}
                      alt={SYMBOLS[sym].nameVi}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="bg-red-900/90 text-amber-300 text-[8px] sm:text-[9px] font-black px-1 py-0.2 rounded-full border border-amber-400/50 uppercase tracking-tight shadow">
                    {SYMBOLS[sym].nameVi}
                  </div>
                </motion.div>
              );
            })
          ) : (
            <div className="w-10 h-10 rounded-full bg-amber-500/10 border border-amber-500/20 animate-pulse" />
          )}
        </div>

        {/* Ceramic Bowl (Bát úp) with 3D Rotate, Tilt & Open Animation */}
        <AnimatePresence>
          <motion.div
            className="absolute z-20 w-36 h-36 sm:w-44 sm:h-44 rounded-full flex items-center justify-center select-none"
            style={{ transformStyle: 'preserve-3d' }}
            animate={
              state === 'ROLLING'
                ? {
                    x: [0, -10, 10, -8, 8, -4, 4, 0],
                    y: [0, 6, -6, 5, -5, 2, -2, 0],
                    rotateZ: [0, -6, 6, -4, 4, -2, 2, 0],
                    rotateX: [0, 6, -6, 4, -4, 0],
                    rotateY: [0, -6, 6, -4, 4, 0],
                    transition: { repeat: Infinity, duration: 0.32, ease: 'easeInOut' },
                  }
                : state === 'REVEALED'
                ? {
                    x: [0, -10, 48, 60],
                    y: [0, -22, -100, -115],
                    rotateZ: [0, -10, 30, 36],
                    rotateX: [0, 24, 30, 26],
                    rotateY: [0, 10, -16, -12],
                    scale: [1, 1.04, 1.05, 0.94],
                    opacity: [1, 1, 0.96, 0.92],
                    transition: {
                      duration: 1.25,
                      times: [0, 0.22, 0.72, 1],
                      ease: [0.22, 1, 0.36, 1],
                    },
                  }
                : {
                    x: 0,
                    y: 0,
                    rotateZ: 0,
                    rotateX: 0,
                    rotateY: 0,
                    scale: 1,
                    opacity: 1,
                    transition: { duration: 0.4 },
                  }
            }
          >
            <div className="relative w-full h-full rounded-full shadow-[0_12px_28px_rgba(0,0,0,0.8),0_0_15px_rgba(245,158,11,0.3)] overflow-hidden border-2 border-amber-400/60">
              <img
                src="/assets/bat.jpg"
                alt="Bát úp Bầu Cua"
                className="w-full h-full object-cover rounded-full pointer-events-none"
              />
              <div className="absolute inset-0 bg-radial from-amber-400/25 via-transparent to-black/50 pointer-events-none rounded-full" />
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Prominent Large Troll Suspense Hero Banner during Shaking */}
      {state === 'ROLLING' && (
        <motion.div
          key={trollQuote}
          initial={{ scale: 0.9, opacity: 0, y: 8 }}
          animate={{ scale: [0.97, 1.03, 1], opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="w-full my-1.5 px-3 py-2 rounded-2xl bg-gradient-to-r from-red-950/95 via-amber-950 to-red-950/95 border-2 border-amber-400 shadow-[0_0_25px_rgba(245,158,11,0.6)] text-center flex items-center justify-center gap-2"
        >
          <Flame size={18} className="text-red-500 animate-bounce shrink-0" />
          <span className="text-xs sm:text-sm md:text-base font-black text-amber-200 tracking-wide italic drop-shadow">
            "{trollQuote}"
          </span>
          <Flame size={18} className="text-red-500 animate-bounce shrink-0" />
        </motion.div>
      )}

      {/* Result Mascot Announcement Banner */}
      {state === 'REVEALED' && diceResult && (
        <motion.div
          initial={{ scale: 0.8, opacity: 0, y: 6 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          className="flex items-center space-x-2 bg-gradient-to-r from-red-950 via-amber-950/80 to-red-950 border border-amber-400/60 px-3.5 py-1 rounded-full shadow-gold-glow mb-1"
        >
          <Sparkles size={14} className="text-amber-400 animate-spin" />
          <span className="text-xs sm:text-sm font-black text-amber-200 tracking-wide uppercase">
            {diceResult.map((s) => SYMBOLS[s].nameVi).join(' • ')}
          </span>
          <Sparkles size={14} className="text-amber-400 animate-spin" />
        </motion.div>
      )}

      {/* Host Controls & Action Buttons */}
      <div className="mt-0.5 flex flex-wrap items-center justify-center gap-2 w-full">
        {isHost ? (
          <>
            {(state === 'WAITING' || state === 'REVEALED') && (
              <button
                onClick={() => {
                  sound.playChip();
                  onStartRound();
                }}
                className="flex items-center space-x-1.5 bg-gradient-to-r from-emerald-600 via-emerald-500 to-emerald-600 hover:from-emerald-500 hover:to-emerald-400 text-white font-black px-5 py-2 rounded-full shadow-lg border border-emerald-300/40 transition active:scale-95 text-xs uppercase tracking-wider"
              >
                <Play size={14} fill="white" />
                <span>{state === 'REVEALED' ? 'Ván Tiếp Theo (20s)' : 'Bắt Đầu Ván Mới (20s)'}</span>
              </button>
            )}

            {state === 'BETTING' && (
              <button
                onClick={() => {
                  sound.playChip();
                  onLockBetting();
                }}
                className="flex items-center space-x-1.5 bg-gradient-to-r from-red-600 via-amber-600 to-red-600 hover:from-red-500 hover:to-amber-500 text-white font-black px-5 py-2 rounded-full shadow-lg border border-amber-300/50 transition active:scale-95 text-xs animate-pulse uppercase tracking-wider"
              >
                <Lock size={14} />
                <span>Khóa Cược & Xóc Ngay</span>
              </button>
            )}
          </>
        ) : (
          <div className="text-xs font-bold text-amber-200/90 bg-red-950/70 border border-amber-500/30 px-3 py-1.5 rounded-full text-center">
            {state === 'WAITING' && '🏮 Đang đợi chủ phòng mở ván mới...'}
            {state === 'BETTING' && '🔥 Hãy chọn linh vật và tất tay ngay!'}
            {state === 'ROLLING' && '⚡ Bát đang xóc, nín thở chờ mở bát!'}
            {state === 'REVEALED' && '✨ Vòng cược đã kết thúc, chuẩn bị ván mới!'}
          </div>
        )}

        {/* View Results Modal Early Button */}
        {state === 'REVEALED' && onShowResultModal && (
          <button
            onClick={() => {
              sound.playChip();
              onShowResultModal();
            }}
            className="flex items-center space-x-1 bg-black/50 hover:bg-black/70 text-amber-300 hover:text-amber-200 text-xs font-bold px-3 py-1.5 rounded-full border border-amber-500/40 transition active:scale-95"
          >
            <Eye size={13} />
            <span>Xem Bảng Kết Quả</span>
          </button>
        )}
      </div>
    </div>
  );
};
