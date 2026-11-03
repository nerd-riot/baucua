'use client';

import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { DiceResult, Player, Room, RoundState, SYMBOLS, SymbolId } from '@/types';
import { sound } from '@/lib/sound';
import { Play, Lock, Sparkles, Clock, Flame, Eye, Volume2, VolumeX } from 'lucide-react';

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

const TROLL_BETTING_QUOTES = [
  "Cược nhanh tay, ván này thơm phức! 🍜",
  "Đừng suy nghĩ nhiều, linh cảm mách bảo con gì thì quất! 💡",
  "Liều ăn nhiều, không liều thì ăn bánh chưng chay! 🥟",
  "Vận may đang vẫy gọi, ai dám tất tay làm vua ván này? 👑",
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
  const [isMuted, setIsMuted] = useState<boolean>(() => sound.getMuted());
  const autoLockTriggeredRef = useRef(false);

  useEffect(() => {
    return sound.subscribe((muted) => setIsMuted(muted));
  }, []);
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

      // Auto lock betting when time expires
      if (remainingMs <= 0 && isHost && !autoLockTriggeredRef.current) {
        autoLockTriggeredRef.current = true;
        onLockBetting();
      }
    }, 400);

    return () => clearInterval(interval);
  }, [state, currentRound.bettingEndsAt, isHost, onLockBetting]);

  // Handle ROLLING state: Rattle sound loop
  useEffect(() => {
    if (state === 'ROLLING') {
      sound.playDiceShake();
      const interval = setInterval(() => {
        sound.playDiceShake();
      }, 650);
      return () => clearInterval(interval);
    }
  }, [state]);

  // Handle REVEALED state: Dramatic bowl reveal sound, staggered dice drop sounds & festive fireworks
  useEffect(() => {
    if (state === 'REVEALED' && diceResult) {
      // 1. Bowl opening swoosh chime
      sound.playBowlOpen();

      // 2. Staggered dice landing clicks
      const t1 = setTimeout(() => sound.playDiceLand(), 250);
      const t2 = setTimeout(() => sound.playDiceLand(), 550);
      const t3 = setTimeout(() => sound.playDiceLand(), 850);

      // 3. Subtle & refined celebration burst (ít pháo hoa, tinh tế, không che màn hình)
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
      }, 950);

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
    <div className="relative flex flex-col items-center justify-center p-4 sm:p-5 bg-gradient-to-b from-red-950/95 via-tet-card to-black/95 rounded-3xl border-2 border-amber-500/40 shadow-royal overflow-hidden max-w-xl mx-auto w-full select-none">
      {/* Decorative festive corners */}
      <div className="absolute top-2.5 left-2.5 text-amber-500/40 text-xs">❖</div>
      <div className="absolute top-2.5 right-2.5 text-amber-500/40 text-xs">❖</div>
      <div className="absolute bottom-2.5 left-2.5 text-amber-500/40 text-xs">❖</div>
      <div className="absolute bottom-2.5 right-2.5 text-amber-500/40 text-xs">❖</div>

      {/* Header Status Bar */}
      <div className="flex items-center justify-between w-full mb-2 px-1">
        <div className="flex items-center space-x-2">
          <span className="text-xs uppercase tracking-wider font-extrabold text-amber-300 bg-red-900/80 px-3 py-1 rounded-full border border-amber-500/40 shadow-sm">
            Ván #{currentRound.roundNumber}
          </span>
          <span className="text-xs sm:text-sm font-bold text-amber-100 flex items-center gap-1.5 overflow-hidden">
            {state === 'WAITING' && '🏮 Chờ bắt đầu ván mới...'}
            {state === 'BETTING' && '🔥 Đang đặt cược, húp lẹ!'}
            {state === 'ROLLING' && (
              <span className="text-amber-300 flex items-center gap-1.5 animate-pulse truncate max-w-[280px] sm:max-w-md font-black">
                <Flame size={15} className="text-red-500 animate-bounce shrink-0" />
                <span className="truncate">{trollQuote}</span>
              </span>
            )}
            {state === 'REVEALED' && (
              <span className="text-emerald-400 flex items-center gap-1 font-black">
                <Sparkles size={15} className="text-amber-400 animate-spin" />
                Đã mở bát — Ai khóc ai cười?
              </span>
            )}
          </span>
        </div>

        {/* Right side of Header: Sound Toggle & Countdown */}
        <div className="flex items-center space-x-2 shrink-0">
          {/* Quick Sound Toggle Button */}
          <button
            type="button"
            onClick={() => {
              const nextMuted = sound.toggleMute();
              setIsMuted(nextMuted);
            }}
            className={`flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-black border transition active:scale-95 ${
              isMuted
                ? 'bg-red-950/90 text-red-300 border-red-500/60 hover:bg-red-900'
                : 'bg-black/60 text-amber-300 border-amber-500/40 hover:bg-amber-900/40'
            }`}
            title={isMuted ? 'Bật âm thanh' : 'Tắt âm thanh'}
          >
            {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
            <span className="text-[10px] hidden xs:inline">{isMuted ? 'Tắt âm' : 'Bật âm'}</span>
          </button>

          {/* Countdown Badge */}
          {state === 'BETTING' && (
            <div className="flex items-center space-x-1.5 bg-amber-500/20 text-amber-300 border border-amber-500/60 px-3 py-1 rounded-full font-mono font-black text-sm shadow-gold-glow animate-pulse">
              <Clock size={15} />
              <span>{timeLeft}s</span>
            </div>
          )}
        </div>
      </div>

      {/* Main Plate and Bowl Stage with 3D Perspective */}
      <div
        className="relative w-64 h-64 sm:w-72 sm:h-72 flex items-center justify-center my-3"
        style={{ perspective: 1200 }}
      >
        {/* Shaking vibration shockwave aura around the plate */}
        {state === 'ROLLING' && (
          <motion.div
            animate={{
              scale: [0.95, 1.08, 0.95],
              opacity: [0.3, 0.8, 0.3],
            }}
            transition={{ repeat: Infinity, duration: 0.5, ease: 'easeInOut' }}
            className="absolute inset-0 rounded-full border-2 border-amber-400/80 shadow-[0_0_35px_rgba(245,158,11,0.7)] pointer-events-none"
          />
        )}

        {/* Porcelain Plate (Đĩa sứ truyền thống) */}
        <div className="absolute inset-0 rounded-full border-4 border-amber-500/60 bg-gradient-to-br from-amber-950/60 via-red-950 to-black shadow-2xl flex items-center justify-center p-3 overflow-hidden">
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
        <div className="absolute z-10 flex items-center justify-center gap-2 sm:gap-3.5">
          {state === 'REVEALED' && diceResult ? (
            diceResult.map((sym, idx) => {
              const delays = [0.2, 0.5, 0.8];
              const rotations = [-8, 4, -5];
              return (
                <motion.div
                  key={`${sym}-${idx}`}
                  initial={{
                    scale: 0,
                    rotateX: 720 * (idx % 2 === 0 ? 1 : -1),
                    rotateY: 540 * (idx % 2 === 0 ? -1 : 1),
                    rotateZ: 360,
                    y: -90,
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
                  className="relative w-18 h-18 sm:w-22 sm:h-22 rounded-2xl bg-gradient-to-br from-amber-100 via-white to-amber-200 p-1.5 shadow-[0_12px_24px_rgba(0,0,0,0.8),0_0_20px_rgba(245,158,11,0.6)] flex flex-col items-center justify-between border-2 border-amber-400"
                >
                  {/* Dice Inner Mascot Artwork */}
                  <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl overflow-hidden shadow-inner border border-amber-400/50 bg-black/10">
                    <img
                      src={getSymbolImage(sym)}
                      alt={SYMBOLS[sym].nameVi}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  {/* Animal Vietnamese Name Badge */}
                  <div className="bg-red-900/90 text-amber-300 text-[10px] sm:text-xs font-black px-2 py-0.5 rounded-full border border-amber-400/50 uppercase tracking-tight shadow">
                    {SYMBOLS[sym].nameVi}
                  </div>
                </motion.div>
              );
            })
          ) : (
            <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/20 animate-pulse" />
          )}
        </div>

        {/* Ceramic Bowl (Bát úp) with 3D Rotate, Tilt & Open Animation */}
        <AnimatePresence>
          <motion.div
            className="absolute z-20 w-48 h-48 sm:w-56 sm:h-56 rounded-full flex items-center justify-center select-none"
            style={{ transformStyle: 'preserve-3d' }}
            animate={
              state === 'ROLLING'
                ? {
                    x: [0, -12, 12, -9, 9, -5, 5, 0],
                    y: [0, 8, -8, 6, -6, 3, -3, 0],
                    rotateZ: [0, -7, 7, -5, 5, -2, 2, 0],
                    rotateX: [0, 8, -8, 5, -5, 0],
                    rotateY: [0, -8, 8, -5, 5, 0],
                    transition: { repeat: Infinity, duration: 0.32, ease: 'easeInOut' },
                  }
                : state === 'REVEALED'
                ? {
                    x: [0, -12, 60, 75],
                    y: [0, -28, -135, -150],
                    rotateZ: [0, -12, 32, 38],
                    rotateX: [0, 26, 32, 28],
                    rotateY: [0, 12, -18, -14],
                    scale: [1, 1.05, 1.06, 0.94],
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
            <div className="relative w-full h-full rounded-full shadow-[0_15px_35px_rgba(0,0,0,0.8),0_0_20px_rgba(245,158,11,0.3)] overflow-hidden border-2 border-amber-400/60">
              <img
                src="/assets/bat.jpg"
                alt="Bát úp Bầu Cua"
                className="w-full h-full object-cover rounded-full pointer-events-none"
              />
              {/* Bowl Decorative Gilded Center */}
              <div className="absolute inset-0 bg-radial from-amber-400/25 via-transparent to-black/50 pointer-events-none rounded-full" />
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Result Mascot Announcement Banner */}
      {state === 'REVEALED' && diceResult && (
        <motion.div
          initial={{ scale: 0.8, opacity: 0, y: 8 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          className="flex items-center space-x-2 bg-gradient-to-r from-red-950 via-amber-950/80 to-red-950 border border-amber-400/60 px-4 py-1.5 rounded-full shadow-gold-glow mb-2"
        >
          <Sparkles size={15} className="text-amber-400 animate-spin" />
          <span className="text-xs sm:text-sm font-black text-amber-200 tracking-wide uppercase">
            {diceResult.map((s) => SYMBOLS[s].nameVi).join(' • ')}
          </span>
          <Sparkles size={15} className="text-amber-400 animate-spin" />
        </motion.div>
      )}

      {/* Host Controls & Action Buttons */}
      <div className="mt-1 flex flex-wrap items-center justify-center gap-2.5 w-full">
        {isHost ? (
          <>
            {(state === 'WAITING' || state === 'REVEALED') && (
              <button
                onClick={() => {
                  sound.playChip();
                  onStartRound();
                }}
                className="flex items-center space-x-2 bg-gradient-to-r from-emerald-600 via-emerald-500 to-emerald-600 hover:from-emerald-500 hover:to-emerald-400 text-white font-black px-6 py-2.5 rounded-full shadow-lg border border-emerald-300/40 transition active:scale-95 text-xs sm:text-sm uppercase tracking-wider"
              >
                <Play size={16} fill="white" />
                <span>{state === 'REVEALED' ? 'Ván Tiếp Theo (20s)' : 'Bắt Đầu Ván Mới (20s)'}</span>
              </button>
            )}

            {state === 'BETTING' && (
              <button
                onClick={() => {
                  sound.playChip();
                  onLockBetting();
                }}
                className="flex items-center space-x-2 bg-gradient-to-r from-red-600 via-amber-600 to-red-600 hover:from-red-500 hover:to-amber-500 text-white font-black px-6 py-2.5 rounded-full shadow-lg border border-amber-300/50 transition active:scale-95 text-xs sm:text-sm animate-pulse uppercase tracking-wider"
              >
                <Lock size={16} />
                <span>Khóa Cược & Xóc Ngay</span>
              </button>
            )}

            {state === 'ROLLING' && (
              <motion.div
                key={trollQuote}
                initial={{ scale: 0.95, opacity: 0, y: 3 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className="flex items-center space-x-2 text-amber-200 text-xs sm:text-sm font-black bg-gradient-to-r from-red-950 via-amber-950 to-red-950 px-5 py-2.5 rounded-full border border-amber-400/60 shadow-gold-glow text-center max-w-md"
              >
                <Flame size={16} className="text-red-400 animate-bounce shrink-0" />
                <span className="italic">"{trollQuote}"</span>
              </motion.div>
            )}
          </>
        ) : (
          <div className="text-xs sm:text-sm font-bold text-amber-200/90 bg-red-950/70 border border-amber-500/30 px-4 py-2 rounded-full text-center max-w-md">
            {state === 'WAITING' && '🏮 Đang đợi chủ phòng mở ván mới...'}
            {state === 'BETTING' && '🔥 Hãy chọn linh vật và tất tay ngay!'}
            {state === 'ROLLING' && (
              <span className="flex items-center justify-center gap-1.5 text-amber-300 font-black animate-pulse">
                <Flame size={15} className="text-red-400 animate-bounce shrink-0" />
                <span>"{trollQuote}"</span>
              </span>
            )}
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
            className="flex items-center space-x-1.5 bg-black/50 hover:bg-black/70 text-amber-300 hover:text-amber-200 text-xs font-bold px-3.5 py-2 rounded-full border border-amber-500/40 transition active:scale-95"
          >
            <Eye size={14} />
            <span>Xem Bảng Kết Quả</span>
          </button>
        )}
      </div>
    </div>
  );
};
