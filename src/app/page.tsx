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
    <main className="min-h-screen flex flex-col bg-tet-bg text-tet-silk">
      {!room ? (
        <Lobby
          player={player}
          rooms={roomsList}
          onUpdateProfile={handleUpdateProfile}
          onCreateRoom={handleCreateRoom}
          onJoinRoom={handleJoinRoom}
          onRefreshRooms={handleRefreshRooms}
        />
      ) : (
        player && (
          <div className="flex flex-col min-h-screen">
            <TopBar
              room={room}
              currentPlayer={player}
              onLeave={handleLeaveRoom}
              onReloadPoints={handleReloadPoints}
            />

            {/* Mobile Tab Switcher */}
            <div className="flex md:hidden bg-red-950/90 border-b border-amber-500/20 px-2 py-1 justify-around text-xs font-bold">
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

            {/* Main Stage */}
            <div className="flex-1 max-w-7xl w-full mx-auto p-2 sm:p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Left/Center: Game Board & Dice Shaker */}
              <div
                className={`md:col-span-2 flex flex-col space-y-4 ${
                  activeTab !== 'game' ? 'hidden md:flex' : 'flex'
                }`}
              >
                <DiceShaker
                  room={room}
                  currentPlayer={player}
                  onStartRound={handleStartRound}
                  onLockBetting={handleLockBetting}
                  onShowResultModal={() => setShowWinModal(true)}
                />

                <GameBoard
                  room={room}
                  currentPlayer={player}
                  boardSummary={boardSummary}
                  onPlaceBet={handlePlaceBet}
                />
              </div>

              {/* Right: Players & Chat */}
              <div
                className={`flex flex-col space-y-4 ${
                  activeTab === 'game' ? 'hidden md:flex' : 'flex'
                }`}
              >
                <div className={activeTab === 'chat' ? 'hidden md:block' : 'block'}>
                  <PlayerList room={room} currentPlayer={player} />
                </div>
                <div className={activeTab === 'players' ? 'hidden md:block' : 'block'}>
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
                onClose={() => setShowWinModal(false)}
              />
            )}
          </div>
        )
      )}
    </main>
  );
}
