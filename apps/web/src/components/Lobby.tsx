'use client';

import React, { useState } from 'react';
import { DEFAULT_AVATARS, Player, RoomSummary } from '@bau-cua/types';
import { sound } from '@/lib/sound';
import { Plus, Users, Lock, RefreshCw, KeyRound, Sparkles } from 'lucide-react';

interface LobbyProps {
  player: Player | null;
  rooms: RoomSummary[];
  onUpdateProfile: (nickname: string, avatarId: string) => void;
  onCreateRoom: (options: {
    name: string;
    isPrivate: boolean;
    passcode?: string;
    maxPlayers: number;
  }) => void;
  onJoinRoom: (roomIdOrCode: string, passcode?: string) => void;
  onRefreshRooms: () => void;
}

export const Lobby: React.FC<LobbyProps> = ({
  player,
  rooms,
  onUpdateProfile,
  onCreateRoom,
  onJoinRoom,
  onRefreshRooms,
}) => {
  const [nickname, setNickname] = useState(player ? player.nickname : 'Người Chơi');
  const [avatarId, setAvatarId] = useState(player ? player.avatarId : DEFAULT_AVATARS[0].id);

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinCodeModal, setShowJoinCodeModal] = useState(false);

  // Create room inputs
  const [roomName, setRoomName] = useState('Phòng Hội Xuân');
  const [isPrivate, setIsPrivate] = useState(false);
  const [passcode, setPasscode] = useState('');
  const [maxPlayers, setMaxPlayers] = useState(30);

  // Join by code inputs
  const [joinCode, setJoinCode] = useState('');
  const [joinPasscode, setJoinPasscode] = useState('');

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nickname.trim()) return;
    sound.playChip();
    onUpdateProfile(nickname.trim(), avatarId);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sound.playChip();
    onCreateRoom({
      name: roomName.trim() || 'Phòng Bầu Cua',
      isPrivate,
      passcode: isPrivate ? passcode : undefined,
      maxPlayers,
    });
    setShowCreateModal(false);
  };

  const handleJoinByCodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) return;
    sound.playChip();
    onJoinRoom(joinCode.trim().toUpperCase(), joinPasscode || undefined);
    setShowJoinCodeModal(false);
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-4 flex flex-col items-center">
      {/* Game Branding Header */}
      <div className="flex flex-col items-center my-4 text-center">
        <div className="relative w-44 sm:w-56 mb-2">
          <img
            src="/assets/01_branding/logo_bau_cua_online.png"
            alt="Logo Bầu Cua Online"
            className="w-full h-auto drop-shadow-[0_8px_16px_rgba(245,158,11,0.5)]"
          />
        </div>
        <p className="text-xs sm:text-sm text-amber-200/90 font-medium max-w-md">
          Trò chơi dân gian Việt Nam trực tuyến nhiều người chơi. Đồ họa Tết Giáp Thìn đậm đà sắc xuân!
        </p>
      </div>

      {/* Guest Profile Card */}
      <div className="w-full bg-gradient-to-r from-red-950 via-tet-card to-red-950 border-2 border-amber-500/40 rounded-3xl p-4 sm:p-6 shadow-royal mb-6">
        <form onSubmit={handleSaveProfile} className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
          {/* Avatar selector */}
          <div className="flex flex-col items-center">
            <span className="text-xs text-amber-300 font-bold mb-2">Chọn nhân vật:</span>
            <div className="flex items-center space-x-2">
              {DEFAULT_AVATARS.map((av) => {
                const isSelected = avatarId === av.id;
                return (
                  <button
                    key={av.id}
                    type="button"
                    onClick={() => {
                      sound.playChip();
                      setAvatarId(av.id);
                    }}
                    className={`relative w-12 h-12 sm:w-14 sm:h-14 rounded-full overflow-hidden border-2 transition ${
                      isSelected
                        ? 'border-amber-400 ring-4 ring-amber-400/50 scale-105 bg-amber-500/20'
                        : 'border-amber-700/60 opacity-60 hover:opacity-100 bg-black/40'
                    }`}
                    title={av.nameVi}
                  >
                    <img
                      src={`/assets/${av.assetPath}`}
                      alt={av.nameVi}
                      className="w-full h-full object-cover"
                    />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Nickname and submit */}
          <div className="flex-1 w-full flex flex-col justify-center">
            <label className="text-xs text-amber-300 font-bold mb-1">Tên hiển thị (Nickname):</label>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                maxLength={20}
                placeholder="Nhập tên của bạn..."
                className="flex-1 bg-black/60 border border-amber-500/50 rounded-xl px-3 py-2 text-sm text-amber-100 placeholder:text-amber-500/30 focus:outline-none focus:border-amber-400"
              />
              <button
                type="submit"
                className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-red-950 font-black px-4 py-2 rounded-xl text-xs sm:text-sm shadow transition active:scale-95"
              >
                Lưu
              </button>
            </div>
            {player && (
              <span className="text-[11px] text-amber-400/80 mt-1.5 flex items-center gap-1 font-mono">
                💰 Số điểm: <strong>{player.points.toLocaleString()}</strong> pts
              </span>
            )}
          </div>
        </form>
      </div>

      {/* Action Buttons: Create Room & Join by Code */}
      <div className="flex items-center justify-between w-full mb-3 gap-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              sound.playChip();
              setShowCreateModal(true);
            }}
            className="flex items-center gap-1.5 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-black px-4 py-2.5 rounded-xl text-xs sm:text-sm shadow-royal transition active:scale-95"
          >
            <Plus size={16} />
            <span>Tạo Phòng Mới</span>
          </button>

          <button
            onClick={() => {
              sound.playChip();
              setShowJoinCodeModal(true);
            }}
            className="flex items-center gap-1.5 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-red-950 font-black px-4 py-2.5 rounded-xl text-xs sm:text-sm shadow-royal transition active:scale-95"
          >
            <KeyRound size={16} />
            <span>Nhập Mã Phòng</span>
          </button>
        </div>

        <button
          onClick={() => {
            sound.playChip();
            onRefreshRooms();
          }}
          className="p-2.5 bg-black/60 hover:bg-black/80 text-amber-300 border border-amber-500/40 rounded-xl transition active:scale-95"
          title="Làm mới danh sách"
        >
          <RefreshCw size={16} />
        </button>
      </div>

      {/* Public Rooms List */}
      <div className="w-full bg-gradient-to-b from-red-950/90 to-black/90 rounded-3xl border-2 border-amber-500/30 p-4 shadow-royal">
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-amber-500/20">
          <span className="text-sm font-black text-amber-300 flex items-center gap-2">
            <Users size={18} className="text-amber-400" /> Danh Sách Phòng Chơi ({rooms.length})
          </span>
          <span className="text-xs text-amber-400/60">Hỗ trợ tối đa 30 người / phòng</span>
        </div>

        {rooms.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <span className="text-3xl mb-2">🏮</span>
            <p className="text-sm text-amber-200/70 font-semibold mb-3">
              Chưa có phòng công khai nào đang mở.
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-amber-500 hover:bg-amber-400 text-red-950 text-xs font-black px-4 py-2 rounded-xl transition"
            >
              Tạo phòng ngay bây giờ!
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-96 overflow-y-auto pr-1">
            {rooms.map((r) => (
              <div
                key={r.id}
                className="bg-black/40 hover:bg-black/60 border border-amber-500/30 hover:border-amber-400 rounded-2xl p-3 flex items-center justify-between transition shadow"
              >
                <div className="flex flex-col min-w-0 pr-2">
                  <div className="flex items-center gap-1.5">
                    <span className="font-extrabold text-amber-200 text-sm truncate">
                      {r.name}
                    </span>
                    {r.isPrivate && <Lock size={12} className="text-amber-400 shrink-0" />}
                  </div>
                  <div className="flex items-center space-x-2 text-[11px] text-amber-400/80 mt-1">
                    <span>Mã: <strong className="font-mono text-amber-300">{r.code}</strong></span>
                    <span>•</span>
                    <span>Host: {r.hostNickname}</span>
                    <span>•</span>
                    <span className="font-semibold">{r.playerCount}/{r.maxPlayers} người</span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    sound.playChip();
                    onJoinRoom(r.code);
                  }}
                  className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-red-950 font-black px-3.5 py-1.5 rounded-xl text-xs shadow transition active:scale-95 shrink-0"
                >
                  Vào chơi
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal: Create Room */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-gradient-to-b from-red-950 via-tet-card to-black rounded-3xl border-2 border-amber-400 p-6 w-full max-w-md shadow-royal">
            <h3 className="text-lg font-black text-gold-gradient uppercase mb-4 text-center">
              Tạo Phòng Chơi Mới
            </h3>
            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="text-xs text-amber-300 font-bold block mb-1">Tên phòng:</label>
                <input
                  type="text"
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  maxLength={40}
                  className="w-full bg-black/60 border border-amber-500/50 rounded-xl px-3 py-2 text-sm text-amber-100 focus:outline-none focus:border-amber-400"
                  required
                />
              </div>

              <div>
                <label className="text-xs text-amber-300 font-bold block mb-1">
                  Số người tối đa (2 - 30): {maxPlayers}
                </label>
                <input
                  type="range"
                  min={2}
                  max={30}
                  value={maxPlayers}
                  onChange={(e) => setMaxPlayers(parseInt(e.target.value, 10))}
                  className="w-full accent-amber-500 cursor-pointer"
                />
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="isPrivateCheck"
                  checked={isPrivate}
                  onChange={(e) => setIsPrivate(e.target.checked)}
                  className="accent-amber-500 w-4 h-4 rounded cursor-pointer"
                />
                <label htmlFor="isPrivateCheck" className="text-xs text-amber-200 font-semibold cursor-pointer">
                  Phòng riêng tư (yêu cầu mật khẩu)
                </label>
              </div>

              {isPrivate && (
                <div>
                  <label className="text-xs text-amber-300 font-bold block mb-1">Mật mã phòng:</label>
                  <input
                    type="password"
                    value={passcode}
                    onChange={(e) => setPasscode(e.target.value)}
                    placeholder="Nhập mật khẩu phòng..."
                    className="w-full bg-black/60 border border-amber-500/50 rounded-xl px-3 py-2 text-sm text-amber-100 focus:outline-none focus:border-amber-400"
                    required={isPrivate}
                  />
                </div>
              )}

              <div className="flex items-center space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 bg-red-900/60 hover:bg-red-800 text-amber-200 text-xs font-bold py-2.5 rounded-xl border border-red-700/50 transition"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-red-950 text-xs font-black py-2.5 rounded-xl shadow transition"
                >
                  Xác Nhận Tạo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Join By Code */}
      {showJoinCodeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-gradient-to-b from-red-950 via-tet-card to-black rounded-3xl border-2 border-amber-400 p-6 w-full max-w-sm shadow-royal">
            <h3 className="text-lg font-black text-gold-gradient uppercase mb-4 text-center">
              Nhập Mã Phòng
            </h3>
            <form onSubmit={handleJoinByCodeSubmit} className="space-y-4">
              <div>
                <label className="text-xs text-amber-300 font-bold block mb-1">Mã phòng (6 ký tự):</label>
                <input
                  type="text"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  maxLength={8}
                  placeholder="Ví dụ: TET688"
                  className="w-full bg-black/60 border border-amber-500/50 rounded-xl px-3 py-2 text-center text-lg font-mono font-black text-amber-300 tracking-widest focus:outline-none focus:border-amber-400 uppercase"
                  required
                />
              </div>

              <div>
                <label className="text-xs text-amber-300 font-bold block mb-1">Mật khẩu (nếu có):</label>
                <input
                  type="password"
                  value={joinPasscode}
                  onChange={(e) => setJoinPasscode(e.target.value)}
                  placeholder="Để trống nếu phòng công khai"
                  className="w-full bg-black/60 border border-amber-500/50 rounded-xl px-3 py-2 text-sm text-amber-100 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="flex items-center space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowJoinCodeModal(false)}
                  className="flex-1 bg-red-900/60 hover:bg-red-800 text-amber-200 text-xs font-bold py-2 rounded-xl transition"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-red-950 text-xs font-black py-2 rounded-xl shadow transition"
                >
                  Vào Phòng
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
