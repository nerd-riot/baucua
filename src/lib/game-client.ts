import {
  BoardBetSummary,
  ChatMessage,
  DealerType,
  DiceResult,
  Player,
  PlayerSettlement,
  Room,
  RoomSummary,
  SymbolId,
} from '@/types';

export interface RoomEventCallbacks {
  onStateSync: (room: Room, boardSummary: BoardBetSummary[], messages: ChatMessage[]) => void;
  onPlayerJoined: (player: Player) => void;
  onPlayerLeft: (payload: { playerId: string; newHostId?: string }) => void;
  onRoundStarted: (payload: {
    roundId: string;
    roundNumber: number;
    bettingEndsAt: number;
    durationSeconds: number;
  }) => void;
  onBetPlaced: (payload: { bet: any; boardSummary: BoardBetSummary[] }) => void;
  onRolling: (payload: { roundId: string; shakingDurationMs: number }) => void;
  onSettled: (payload: {
    roundId: string;
    diceResult: DiceResult;
    settlements: PlayerSettlement[];
    boardSummary: BoardBetSummary[];
  }) => void;
  onChatMessage: (message: ChatMessage) => void;
}

export class GameClient {
  public static async listRooms(): Promise<RoomSummary[]> {
    try {
      const res = await fetch('/api/rooms', { cache: 'no-store' });
      const data = await res.json();
      return data.success ? data.rooms : [];
    } catch {
      return [];
    }
  }

  public static async createRoom(
    player: { nickname: string; avatarId: string; deviceId: string },
    options: {
      name: string;
      isPrivate: boolean;
      passcode?: string;
      maxPlayers: number;
      dealerType?: DealerType;
    }
  ): Promise<{ success: boolean; room?: Room; player?: Player; error?: string }> {
    try {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...options, ...player }),
      });
      return await res.json();
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : 'Lỗi kết nối' };
    }
  }

  public static async joinRoom(
    code: string,
    player: { nickname: string; avatarId: string; deviceId: string },
    passcode?: string
  ): Promise<{ success: boolean; room?: Room; player?: Player; error?: string }> {
    try {
      const res = await fetch(`/api/rooms/${code}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...player, passcode }),
      });
      return await res.json();
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : 'Lỗi kết nối' };
    }
  }

  public static async leaveRoom(code: string, playerId: string): Promise<void> {
    try {
      await fetch(`/api/rooms/${code}/leave`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId }),
      });
    } catch {}
  }

  public static async startRound(code: string): Promise<{ success: boolean; error?: string }> {
    try {
      const res = await fetch(`/api/rooms/${code}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      return await res.json();
    } catch (err: unknown) {
      return { success: false, error: 'Lỗi bắt đầu ván' };
    }
  }

  public static async lockAndRoll(code: string): Promise<{ success: boolean; error?: string }> {
    try {
      const res = await fetch(`/api/rooms/${code}/lock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      return await res.json();
    } catch (err: unknown) {
      return { success: false, error: 'Lỗi xóc đĩa' };
    }
  }

  public static async placeBet(
    code: string,
    playerId: string,
    symbol: SymbolId,
    amount: number,
    clientBetId: string
  ): Promise<{
    success: boolean;
    newBalance?: number;
    boardSummary?: BoardBetSummary[];
    error?: string;
  }> {
    try {
      const res = await fetch(`/api/rooms/${code}/bet`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId, symbol, amount, clientBetId }),
      });
      return await res.json();
    } catch (err: unknown) {
      return { success: false, error: 'Lỗi đặt cược' };
    }
  }

  public static async cancelBets(
    code: string,
    playerId: string,
    symbol?: SymbolId
  ): Promise<{
    success: boolean;
    refundedAmount?: number;
    newBalance?: number;
    boardSummary?: BoardBetSummary[];
    error?: string;
  }> {
    try {
      const res = await fetch(`/api/rooms/${code}/bet`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId, symbol }),
      });
      return await res.json();
    } catch (err: unknown) {
      return { success: false, error: 'Lỗi rút cược' };
    }
  }

  public static async sendChat(
    code: string,
    playerId: string,
    text?: string,
    stickerId?: string
  ): Promise<void> {
    try {
      await fetch(`/api/rooms/${code}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId, text, stickerId }),
      });
    } catch {}
  }

  public static async reloadPoints(deviceId: string): Promise<number> {
    try {
      const res = await fetch('/api/player/reload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId }),
      });
      const data = await res.json();
      return data.success ? data.newBalance : 1000;
    } catch {
      return 1000;
    }
  }

  /**
   * Subscribes to real-time events via Server-Sent Events (SSE)
   * with automatic 1.5s snapshot polling fallback.
   */
  public static subscribeToRoom(code: string, callbacks: RoomEventCallbacks): () => void {
    let eventSource: EventSource | null = null;
    let pollInterval: NodeJS.Timeout | null = null;
    let isDisposed = false;

    // 1. Initial snapshot fetch
    const fetchSnapshot = async () => {
      try {
        const res = await fetch(`/api/rooms/${code}`, { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          if (data.success && !isDisposed) {
            callbacks.onStateSync(data.room, data.boardSummary || [], data.chatMessages || []);
          }
        }
      } catch {}
    };

    fetchSnapshot();

    // 2. Poll snapshot every 1500ms for resilient sync on Vercel
    pollInterval = setInterval(fetchSnapshot, 1500);

    // 3. Connect to SSE Stream if supported
    if (typeof window !== 'undefined' && typeof window.EventSource !== 'undefined') {
      try {
        eventSource = new EventSource(`/api/rooms/${code}/events`);

        eventSource.addEventListener('room:playerJoined', (e) => {
          try {
            callbacks.onPlayerJoined(JSON.parse(e.data));
          } catch {}
        });

        eventSource.addEventListener('room:playerLeft', (e) => {
          try {
            callbacks.onPlayerLeft(JSON.parse(e.data));
          } catch {}
        });

        eventSource.addEventListener('round:started', (e) => {
          try {
            callbacks.onRoundStarted(JSON.parse(e.data));
          } catch {}
        });

        eventSource.addEventListener('round:betPlaced', (e) => {
          try {
            callbacks.onBetPlaced(JSON.parse(e.data));
          } catch {}
        });

        eventSource.addEventListener('round:rolling', (e) => {
          try {
            callbacks.onRolling(JSON.parse(e.data));
          } catch {}
        });

        eventSource.addEventListener('round:settled', (e) => {
          try {
            callbacks.onSettled(JSON.parse(e.data));
          } catch {}
        });

        eventSource.addEventListener('chat:message', (e) => {
          try {
            callbacks.onChatMessage(JSON.parse(e.data));
          } catch {}
        });
      } catch {}
    }

    return () => {
      isDisposed = true;
      if (pollInterval) clearInterval(pollInterval);
      if (eventSource) eventSource.close();
    };
  }
}
