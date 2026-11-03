/**
 * Web Audio API & Audio Asset Manager for Bầu Cua Online.
 * Plays high-fidelity sound assets from /sounds/ with Web Audio synthesizer fallbacks.
 */

type SoundListener = (muted: boolean) => void;

class SoundEffects {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private listeners = new Set<SoundListener>();

  // Real Audio Elements
  private bgAudio: HTMLAudioElement | null = null;
  private shakeAudio: HTMLAudioElement | null = null;
  private winAudio: HTMLAudioElement | null = null;
  private loseAudio: HTMLAudioElement | null = null;
  private countDownAudio: HTMLAudioElement | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('bau_cua_muted');
        if (saved !== null) {
          this.isMuted = saved === 'true';
        }
      } catch {}
    }
  }

  private initAudioElements() {
    if (typeof window === 'undefined' || this.bgAudio) return;
    try {
      this.bgAudio = new Audio('/sounds/background.mp3');
      this.bgAudio.loop = true;
      this.bgAudio.volume = 0.35;

      this.shakeAudio = new Audio('/sounds/shake.mp3');
      this.shakeAudio.loop = true;
      this.shakeAudio.volume = 0.85;

      this.winAudio = new Audio('/sounds/coin-collect.mp3');
      this.winAudio.volume = 0.9;

      this.loseAudio = new Audio('/sounds/lose.mp3');
      this.loseAudio.volume = 0.8;

      this.countDownAudio = new Audio('/sounds/count_down_time_up.mp3');
      this.countDownAudio.volume = 0.9;
    } catch {}
  }

  public subscribe(fn: SoundListener): () => void {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }

  private notify() {
    this.listeners.forEach((fn) => {
      try {
        fn(this.isMuted);
      } catch {}
    });
  }

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('bau_cua_muted', String(this.isMuted));
      } catch {}
    }
    if (this.isMuted) {
      this.stopBackgroundMusic();
      this.stopShake();
      this.stopCountDownTimeUp();
    } else {
      this.startBackgroundMusic();
    }
    this.notify();
    return this.isMuted;
  }

  public setMute(muted: boolean): void {
    this.isMuted = muted;
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('bau_cua_muted', String(this.isMuted));
      } catch {}
    }
    if (this.isMuted) {
      this.stopBackgroundMusic();
      this.stopShake();
      this.stopCountDownTimeUp();
    } else {
      this.startBackgroundMusic();
    }
    this.notify();
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  /**
   * Background Music: /sounds/background.mp3 (loops continuously)
   */
  public startBackgroundMusic() {
    this.initAudioElements();
    if (this.isMuted || !this.bgAudio) return;

    this.bgAudio.play().catch(() => {
      // Browser autoplay policy: wait for first user gesture
      const unlockAudio = () => {
        if (!this.isMuted && this.bgAudio) {
          this.bgAudio.play().catch(() => {});
        }
        window.removeEventListener('click', unlockAudio);
        window.removeEventListener('touchstart', unlockAudio);
        window.removeEventListener('keydown', unlockAudio);
      };
      window.addEventListener('click', unlockAudio, { once: true });
      window.addEventListener('touchstart', unlockAudio, { once: true });
      window.addEventListener('keydown', unlockAudio, { once: true });
    });
  }

  public stopBackgroundMusic() {
    if (this.bgAudio) {
      this.bgAudio.pause();
    }
  }

  /**
   * Shake Sound: /sounds/shake.mp3
   * Automatically loops and repeats for the exact duration of the shake action!
   */
  public startShake() {
    this.initAudioElements();
    if (this.isMuted) return;
    if (this.shakeAudio) {
      this.shakeAudio.currentTime = 0;
      this.shakeAudio.loop = true;
      this.shakeAudio.play().catch(() => {});
    }
  }

  public stopShake() {
    if (this.shakeAudio) {
      this.shakeAudio.pause();
      this.shakeAudio.currentTime = 0;
    }
  }

  /**
   * Win Sound: /sounds/coin-collect.mp3 (Chiến thắng)
   */
  public playWin() {
    this.initAudioElements();
    if (this.isMuted) return;
    if (this.winAudio) {
      this.winAudio.currentTime = 0;
      this.winAudio.play().catch(() => {});
    }
  }

  /**
   * Lose Sound: /sounds/lose.mp3 (Thua cuộc)
   */
  public playLose() {
    this.initAudioElements();
    if (this.isMuted) return;
    if (this.loseAudio) {
      this.loseAudio.currentTime = 0;
      this.loseAudio.play().catch(() => {});
    }
  }

  /**
   * Countdown Time Up Sound: /sounds/count_down_time_up.mp3
   * Plays during the final 3-5s countdown before revealing results!
   */
  public playCountDownTimeUp() {
    this.initAudioElements();
    if (this.isMuted) return;
    if (this.countDownAudio) {
      this.countDownAudio.currentTime = 0;
      this.countDownAudio.play().catch(() => {});
    }
  }

  public stopCountDownTimeUp() {
    if (this.countDownAudio) {
      this.countDownAudio.pause();
      this.countDownAudio.currentTime = 0;
    }
  }

  /**
   * Crisp chip placement sound
   */
  public playChip() {
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1400, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.05);

    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.06);
  }

  /**
   * Dramatic Bowl Open / Whoosh sound
   */
  public playBowlOpen() {
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(320, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.25);

    gain.gain.setValueAtTime(0.35, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.42);
  }

  /**
   * Crisp Dice Land / Tumble on porcelain plate
   */
  public playDiceLand() {
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(900 + Math.random() * 200, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(260, ctx.currentTime + 0.05);

    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.06);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.07);
  }

  /**
   * Festive Firework Pop & Crackle
   * Silenced as requested by user to eliminate harsh audio noise
   */
  public playFireworkBurst() {
    // Intentionally silent: fireworks audio is noisy and distracting
  }

  /**
   * Countdown tick
   */
  public playTick() {
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.04);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.05);
  }
}

export const sound = new SoundEffects();
