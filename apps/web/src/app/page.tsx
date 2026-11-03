'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  BoardBetSummary,
  ChatMessage,
  DiceResult,
  Player,
  PlayerSettlement,
  Room,
  RoomSummary,
  SymbolId,
} from '@bau-cua/types';
import { getSocket } from '@/lib/socket';
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
  const [activeTab, setActiveTab] = useState<'game' | 'players' | 'chat'>('game');

  // Initialize socket & guest login
  useEffect(() => {
    const socket = getSocket();

    // Retrieve or generate persistent guest device ID
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

    socket.emit(
      'guest:login',
      { nickname: savedNickname, avatarId: savedAvatarId, deviceId },
      (res) => {
        if (res.success && res.player) {
          setPlayer(res.player);
        }
      }
    );

    // Initial rooms fetch
    socket.emit('lobby:listRooms', (res) => {
      if (res.success) {
        setRoomsList(res.rooms);
      }
    });

    // Listeners
    socket.on('lobby:roomsUpdated', (rooms: RoomSummary[]) => {
      setRoomsList(rooms);
    });

    socket.on('room:stateSync', (updatedRoom: Room) => {
      setRoom(updatedRoom);
      if (player && updatedRoom.players[player.id]) {
        setPlayer((prev) => (prev ? { ...prev, points: updatedRoom.players[player.id].points } : null));
      }
    });

    socket.on('room:playerJoined', (newPlayer: Player) => {
      setRoom((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          players: { ...prev.players, [newPlayer.id]: newPlayer },
        };
      });
    });

    socket.on('room:playerLeft', ({ playerId, newHostId }) => {
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
    });

    socket.on('round:started', ({ roundId, roundNumber, bettingEndsAt }) => {
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
    });

    socket.on('round:betPlaced', ({ boardSummary: newSummary }) => {
      setBoardSummary(newSummary);
    });

    socket.on('round:rolling', () => {
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
    });

    socket.on('round:settled', ({ diceResult, settlements, boardSummary: finalSummary }) => {
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

      // Update current player balance from settlement
      if (player) {
        const mySettlement = settlements.find((s) => s.playerId === player.id);
        if (mySettlement) {
          setPlayer((prev) => (prev ? { ...prev, points: mySettlement.newBalance } : null));
        }
      }

      setShowWinModal(true);
    });

    socket.on('chat:message', (msg: ChatMessage) => {
      setChatMessages((prev) => [...prev.slice(-49), msg]);
    });

    return () => {
      socket.off('lobby:roomsUpdated');
      socket.off('room:stateSync');
      socket.off('room:playerJoined');
      socket.off('room:playerLeft');
      socket.off('round:started');
      socket.off('round:betPlaced');
      socket.off('round:rolling');
      socket.off('round:settled');
      socket.off('chat:message');
    };
  }, []);

  const handleUpdateProfile = (nickname: string, avatarId: string) => {
    const socket = getSocket();
    const deviceId = localStorage.getItem('bau_cua_device_id') || 'dev_guest';
    localStorage.setItem('bau_cua_nickname', nickname);
    localStorage.setItem('bau_cua_avatar', avatarId);

    socket.emit('guest:login', { nickname, avatarId, deviceId }, (res) => {
      if (res.success && res.player) {
        setPlayer(res.player);
      }
    });
  };

  const handleCreateRoom = (options: {
    name: string;
    isPrivate: boolean;
    passcode?: string;
    maxPlayers: number;
  }) => {
    const socket = getSocket();
    socket.emit('room:create', options, (res) => {
      if (res.success && res.room) {
        setRoom(res.room);
        setChatMessages([]);
      } else {
        alert(res.error || 'Tạo phòng thất bại');
      }
    });
  };

  const handleJoinRoom = (roomIdOrCode: string, passcode?: string) => {
    const socket = getSocket();
    socket.emit('room:join', { roomIdOrCode, passcode }, (res) => {
      if (res.success && res.room) {
        setRoom(res.room);
        setChatMessages([]);
      } else {
        alert(res.error || 'Vào phòng thất bại');
      }
    });
  };

  const handleLeaveRoom = () => {
    const socket = getSocket();
    socket.emit('room:leave', () => {
      setRoom(null);
      setBoardSummary([]);
      setChatMessages([]);
      setShowWinModal(false);
      // Refresh lobby rooms
      socket.emit('lobby:listRooms', (res) => {
        if (res.success) setRoomsList(res.rooms);
      });
    });
  };

  const handleStartRound = () => {
    const socket = getSocket();
    socket.emit('host:startRound', (res) => {
      if (!res.success) {
        alert(res.error || 'Không thể bắt đầu vòng');
      }
    });
  };

  const handleLockBetting = () => {
    const socket = getSocket();
    socket.emit('host:lockBetting', (res) => {
      if (!res.success) {
        alert(res.error || 'Không thể khóa cược');
      }
    });
  };

  const handlePlaceBet = (symbol: SymbolId, amount: number) => {
    if (!room) return;
    const socket = getSocket();
    const clientBetId = crypto.randomUUID();

    socket.emit(
      'bet:place',
      {
        roomId: room.id,
        symbol,
        amount,
        clientBetId,
      },
      (res) => {
        if (res.success && res.newBalance !== undefined) {
          setPlayer((prev) => (prev ? { ...prev, points: res.newBalance! } : null));
        } else if (res.error) {
          alert(res.error);
        }
      }
    );
  };

  const handleSendMessage = (text?: string, stickerId?: string) => {
    const socket = getSocket();
    socket.emit('chat:send', { text, stickerId }, () => {});
  };

  const handleReloadPoints = () => {
    const socket = getSocket();
    socket.emit('player:reloadPoints', (res) => {
      if (res.success) {
        setPlayer((prev) => (prev ? { ...prev, points: res.newBalance } : null));
      }
    });
  };

  const handleRefreshRooms = () => {
    const socket = getSocket();
    socket.emit('lobby:listRooms', (res) => {
      if (res.success) setRoomsList(res.rooms);
    });
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
