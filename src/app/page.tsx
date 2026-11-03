'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  BoardBetSummary,
  ChatMessage,
  DiceResult,
  Player,
  PlayerSettlement,
  Room,
  RoomSummary,
  SymbolId,
} from '@/types';
import { GameClient } from '@/lib/game-client';
import { sound } from '@/lib/sound';
import { Lobby } from '@/components/Lobby';
import { TopBar } from '@/components/TopBar';
import { DiceShaker } from '@/components/DiceShaker';
import { GameBoard } from '@/components/GameBoard';
import { PlayerList } from '@/components/PlayerList';
import { ChatBox } from '@/components/ChatBox';
import { WinModal } from '@/components/WinModal';

export default function Home() {
  const [player, setPlayer] = useState<Player | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [roomsList, setRoomsList] = useState<RoomSummary[]>([]);
  const [boardSummary, setBoardSummary] = useState<BoardBetSummary[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [showWinModal, setShowWinModal] = useState<boolean>(false);
  const [isManualReview, setIsManualReview] = useState<boolean>(false);
  const winModalTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [activeTab, setActiveTab] = useState<'game' | 'players' | 'chat'>('game');

  // Load guest profile from localStorage
  useEffect(() => {
    let deviceId = '';
    if (typeof window !== 'undefined') {
      deviceId = localStorage.getItem('bau_cua_device_id') || '';
      if (!deviceId) {
        deviceId = 'dev_' + Math.random().toString(36).substring(2, 10);
        localStorage.setItem('bau_cua_device_id', deviceId);
      }
    }

    const savedNickname =
      typeof window !== 'undefined'
        ? localStorage.getItem('bau_cua_nickname') || 'Người Chơi May Mắn'
        : 'Người Chơi May Mắn';
    const savedAvatarId =
      typeof window !== 'undefined'
        ? localStorage.getItem('bau_cua_avatar') || 'char_boy_ao_dai_xanh'
        : 'char_boy_ao_dai_xanh';

    setPlayer({
      id: 'p_' + deviceId,
      nickname: savedNickname,
      avatarId: savedAvatarId,
      deviceId,
      points: 1000,
      isReady: false,
      isHost: false,
      connected: true,
      joinedAt: Date.now(),
      lastActiveAt: Date.now(),
    });

    // Refresh rooms list
    GameClient.listRooms().then((rooms) => setRoomsList(rooms));

    // Start background game music on user readiness
    sound.startBackgroundMusic();
  }, []);

  // Periodic lobby refresh when outside room
  useEffect(() => {
    if (room) return;
    const interval = setInterval(() => {
      GameClient.listRooms().then((rooms) => setRoomsList(rooms));
    }, 3000);
    return () => clearInterval(interval);
  }, [room]);

  // Subscribe to real-time room events (SSE + polling) when inside room
  useEffect(() => {
    if (!room) return;

    const unsubscribe = GameClient.subscribeToRoom(room.code, {
      onStateSync: (syncedRoom, summary, messages) => {
        setRoom(syncedRoom);
        setBoardSummary(summary);
        if (messages && messages.length > 0) setChatMessages(messages);

        if (player && syncedRoom.players[player.id]) {
          setPlayer((prev) => (prev ? { ...prev, points: syncedRoom.players[player.id].points } : null));
        }
      },
      onPlayerJoined: (newPlayer) => {
        setRoom((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            players: { ...prev.players, [newPlayer.id]: newPlayer },
          };
        });
      },
      onPlayerLeft: ({ playerId, newHostId }) => {
        setRoom((prev) => {
          if (!prev) return null;
          const nextPlayers = { ...prev.players };
          delete nextPlayers[playerId];
          return {
            ...prev,
            hostId: newHostId || prev.hostId,
            players: nextPlayers,
          };
        });
      },
      onRoundStarted: ({ roundId, roundNumber, bettingEndsAt }) => {
        if (winModalTimerRef.current) {
          clearTimeout(winModalTimerRef.current);
          winModalTimerRef.current = null;
        }
        setShowWinModal(false);
        setBoardSummary([]);
        setRoom((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            currentRound: {
              ...prev.currentRound,
              id: roundId,
              roundNumber,
              state: 'BETTING',
              bettingEndsAt,
              diceResult: undefined,
              settlements: undefined,
            },
          };
        });
      },
      onBetPlaced: ({ boardSummary: newSummary }) => {
        setBoardSummary(newSummary);
      },
      onRolling: () => {
        if (winModalTimerRef.current) {
          clearTimeout(winModalTimerRef.current);
          winModalTimerRef.current = null;
        }
        setShowWinModal(false);
        setRoom((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            currentRound: {
              ...prev.currentRound,
              state: 'ROLLING',
            },
          };
        });
      },
      onSettled: ({ diceResult, settlements, boardSummary: finalSummary }) => {
        setBoardSummary(finalSummary);
        setRoom((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            currentRound: {
              ...prev.currentRound,
              state: 'REVEALED',
              diceResult,
              settlements,
            },
          };
        });

        if (player) {
          const mySettlement = settlements.find((s) => s.playerId === player.id);
          if (mySettlement) {
            setPlayer((prev) => (prev ? { ...prev, points: mySettlement.newBalance } : null));
          }
        }

        // Suspense timing: wait 5s after bowl reveal before opening WinModal
        if (winModalTimerRef.current) clearTimeout(winModalTimerRef.current);
        winModalTimerRef.current = setTimeout(() => {
          setIsManualReview(false);
          setShowWinModal(true);
        }, 5000);
      },
      onChatMessage: (msg) => {
        setChatMessages((prev) => [...prev.slice(-49), msg]);
      },
    });

    return () => {
      if (winModalTimerRef.current) {
        clearTimeout(winModalTimerRef.current);
        winModalTimerRef.current = null;
      }
      unsubscribe();
    };
  }, [room?.code, player?.id]);

  const handleUpdateProfile = (nickname: string, avatarId: string) => {
    localStorage.setItem('bau_cua_nickname', nickname);
    localStorage.setItem('bau_cua_avatar', avatarId);
    setPlayer((prev) => (prev ? { ...prev, nickname, avatarId } : null));
  };

  const handleCreateRoom = async (options: {
    name: string;
    isPrivate: boolean;
    passcode?: string;
    maxPlayers: number;
  }) => {
    if (!player) return;
    const res = await GameClient.createRoom(
      { nickname: player.nickname, avatarId: player.avatarId, deviceId: player.deviceId },
      options
    );

    if (res.success && res.room && res.player) {
      setPlayer(res.player);
      setRoom(res.room);
      setChatMessages([]);
    } else {
      alert(res.error || 'Tạo phòng thất bại');
    }
  };

  const handleJoinRoom = async (roomIdOrCode: string, passcode?: string) => {
    if (!player) return;
    const res = await GameClient.joinRoom(
      roomIdOrCode,
      { nickname: player.nickname, avatarId: player.avatarId, deviceId: player.deviceId },
      passcode
    );

    if (res.success && res.room && res.player) {
      setPlayer(res.player);
      setRoom(res.room);
      setChatMessages([]);
    } else {
      alert(res.error || 'Vào phòng thất bại');
    }
  };

  const handleLeaveRoom = async () => {
    if (!room || !player) return;
    await GameClient.leaveRoom(room.code, player.id);
    setRoom(null);
    setBoardSummary([]);
    setChatMessages([]);
    setShowWinModal(false);
    const rooms = await GameClient.listRooms();
    setRoomsList(rooms);
  };

  const handleStartRound = async () => {
    if (!room) return;
    const res = await GameClient.startRound(room.code);
    if (!res.success) {
      alert(res.error || 'Không thể bắt đầu vòng');
    }
  };

  const handleLockBetting = async () => {
    if (!room) return;
    const res = await GameClient.lockAndRoll(room.code);
    if (!res.success) {
      alert(res.error || 'Không thể khóa cược');
    }
  };

  const handlePlaceBet = async (symbol: SymbolId, amount: number) => {
    if (!room || !player) return;
    const clientBetId = crypto.randomUUID();

    const res = await GameClient.placeBet(room.code, player.id, symbol, amount, clientBetId);
    if (res.success && res.newBalance !== undefined) {
      setPlayer((prev) => (prev ? { ...prev, points: res.newBalance! } : null));
    } else if (res.error) {
      alert(res.error);
    }
  };

  const handleSendMessage = (text?: string, stickerId?: string) => {
    if (!room || !player) return;
    GameClient.sendChat(room.code, player.id, text, stickerId);
  };

  const handleReloadPoints = async () => {
    if (!player) return;
    const newBal = await GameClient.reloadPoints(player.deviceId);
    setPlayer((prev) => (prev ? { ...prev, points: newBal } : null));
  };

  const handleRefreshRooms = async () => {
    const rooms = await GameClient.listRooms();
    setRoomsList(rooms);
  };

  return (
    <main className="h-screen max-h-screen overflow-hidden flex flex-col bg-tet-bg text-tet-silk select-none">
      {!room ? (
        <div className="flex-1 overflow-y-auto">
          <Lobby
            player={player}
            rooms={roomsList}
            onUpdateProfile={handleUpdateProfile}
            onCreateRoom={handleCreateRoom}
            onJoinRoom={handleJoinRoom}
            onRefreshRooms={handleRefreshRooms}
          />
        </div>
      ) : (
        player && (
          <div className="flex flex-col h-full max-h-screen overflow-hidden">
            <TopBar
              room={room}
              currentPlayer={player}
              onLeave={handleLeaveRoom}
              onReloadPoints={handleReloadPoints}
            />

            {/* Mobile Tab Switcher */}
            <div className="flex md:hidden shrink-0 bg-red-950/90 border-b border-amber-500/20 px-2 py-1 justify-around text-xs font-bold">
              <button
                onClick={() => setActiveTab('game')}
                className={`py-1.5 px-3 rounded-lg transition ${
                  activeTab === 'game' ? 'bg-amber-500 text-red-950' : 'text-amber-200'
                }`}
              >
                🎲 Bàn Chơi
              </button>
              <button
                onClick={() => setActiveTab('players')}
                className={`py-1.5 px-3 rounded-lg transition ${
                  activeTab === 'players' ? 'bg-amber-500 text-red-950' : 'text-amber-200'
                }`}
              >
                👥 Người Chơi ({Object.keys(room.players).length})
              </button>
              <button
                onClick={() => setActiveTab('chat')}
                className={`py-1.5 px-3 rounded-lg transition ${
                  activeTab === 'chat' ? 'bg-amber-500 text-red-950' : 'text-amber-200'
                }`}
              >
                💬 Trò Chuyện
              </button>
            </div>

            {/* Main Stage - Scales to Full Screen with Zero Page Scroll */}
            <div className="flex-1 min-h-0 w-full p-2 sm:p-2.5 flex flex-col md:flex-row gap-2 sm:gap-2.5 overflow-hidden">
              {/* Left: Shaker + Game Board (Occupies all main space) */}
              <div
                className={`flex-1 min-w-0 flex flex-col h-full min-h-0 overflow-hidden gap-1.5 ${
                  activeTab !== 'game' ? 'hidden md:flex' : 'flex'
                }`}
              >
                <DiceShaker
                  room={room}
                  currentPlayer={player}
                  onStartRound={handleStartRound}
                  onLockBetting={handleLockBetting}
                  onShowResultModal={() => {
                    setIsManualReview(true);
                    setShowWinModal(true);
                  }}
                />

                <GameBoard
                  room={room}
                  currentPlayer={player}
                  boardSummary={boardSummary}
                  onPlaceBet={handlePlaceBet}
                />
              </div>

              {/* Right: Sidebar - Players & Chat (Proportional compact width: 288px - 320px) */}
              <div
                className={`w-full md:w-72 lg:w-80 shrink-0 flex flex-col h-full min-h-0 overflow-hidden gap-1.5 sm:gap-2 ${
                  activeTab === 'game' ? 'hidden md:flex' : 'flex'
                }`}
              >
                <div className={`${activeTab === 'chat' ? 'hidden md:block' : 'block'} shrink-0`}>
                  <PlayerList room={room} currentPlayer={player} />
                </div>
                <div className={`flex-1 min-h-0 ${activeTab === 'players' ? 'hidden md:flex' : 'flex'} flex-col overflow-hidden`}>
                  <ChatBox
                    messages={chatMessages}
                    currentPlayer={player}
                    onSendMessage={handleSendMessage}
                  />
                </div>
              </div>
            </div>

            {/* Win Modal Celebration */}
            {showWinModal && room.currentRound.settlements && (
              <WinModal
                round={room.currentRound}
                currentUserId={player.id}
                isManualReview={isManualReview}
                onClose={() => setShowWinModal(false)}
              />
            )}
          </div>
        )
      )}
    </main>
  );
}
