'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChatMessage, Player } from '@/types';
import { MessageSquare, Send, Smile, X, Sparkles } from 'lucide-react';
import { sound } from '@/lib/sound';

interface ChatBoxProps {
  messages: ChatMessage[];
  currentPlayer: Player;
  onSendMessage: (text?: string, stickerId?: string) => void;
}

// Custom 3D & Mascot Meme Stickers
interface StickerItem {
  id: string;
  name: string;
  image: string;
  caption: string;
}

const MEME_STICKERS: StickerItem[] = [
  {
    id: 'emoji_khoc_troi',
    name: 'Khóc Ròng',
    image: '/assets/emojis/emoji_khoc_troi.jpg',
    caption: 'Ra đê rồi anh em ơi! 😭',
  },
  {
    id: 'sticker_cua_kep',
    name: 'Cua Kẹp',
    image: '/assets/cua.jpg',
    caption: 'Cua kẹp đau điếng! 🦀',
  },
  {
    id: 'sticker_bau_to',
    name: 'Bầu Bự',
    image: '/assets/bau.jpg',
    caption: 'Độ con ván này thần Bầu ơi! 🍐',
  },
  {
    id: 'sticker_ga_gay',
    name: 'Gà Gáy',
    image: '/assets/ga.jpg',
    caption: 'Gáy to lên! Húp trọn sới! 🐔',
  },
  {
    id: 'sticker_tom_nhay',
    name: 'Tôm Nhảy',
    image: '/assets/tom.jpg',
    caption: 'Tôm nhảy tưng bừng! 🦐',
  },
  {
    id: 'sticker_ca_boi',
    name: 'Cá Lội',
    image: '/assets/ca.jpg',
    caption: 'Cá chép hóa rồng! 🐟',
  },
  {
    id: 'sticker_nai_ngo',
    name: 'Nai Vàng',
    image: '/assets/nai.jpg',
    caption: 'Nai ngơ ngác mất tiền! 🦌',
  },
];

// Curated troll & celebration emojis
const TROLL_EMOJIS = [
  '😂', '🤣', '😭', '💀', '🤡', '🤑',
  '💰', '💸', '🔥', '💥', '🎲', '🙏',
  '🚀', '🏮', '🧧', '🦀', '🦐', '🐟',
  '🐔', '🦌', '🍐', '🍻', '🥳', '🤯',
];

// Quick 1-tap reactions
const QUICK_REACTIONS = ['😭', '😂', '💸', '🔥', '🙏', '🦀'];

export const ChatBox: React.FC<ChatBoxProps> = ({
  messages,
  currentPlayer,
  onSendMessage,
}) => {
  const [text, setText] = useState('');
  const [showPicker, setShowPicker] = useState(false);
  const [activeTab, setActiveTab] = useState<'stickers' | 'emojis'>('stickers');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!text.trim()) return;
    sound.playChip();
    onSendMessage(text.trim());
    setText('');
    setShowPicker(false);
  };

  const handleSendSticker = (sticker: StickerItem) => {
    sound.playChip();
    onSendMessage(sticker.caption, sticker.id);
    setShowPicker(false);
  };

  const handleQuickReaction = (emoji: string) => {
    sound.playChip();
    onSendMessage(emoji);
  };

  const handleInsertEmoji = (emoji: string) => {
    setText((prev) => prev + emoji);
  };

  const getStickerImage = (stickerId: string) => {
    const s = MEME_STICKERS.find((item) => item.id === stickerId);
    return s ? s.image : null;
  };

  return (
    <div className="relative bg-gradient-to-b from-red-950/95 via-tet-card to-black/95 rounded-2xl border border-amber-500/40 p-3 shadow-royal flex flex-col flex-1 min-h-0 h-full w-full select-none overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-amber-500/20 text-xs sm:text-sm font-extrabold text-amber-300">
        <div className="flex items-center space-x-1.5">
          <MessageSquare size={16} className="text-amber-400" />
          <span>Trò Chuyện & Thả Reaction</span>
        </div>
        <span className="text-[10px] text-amber-400/70 font-mono bg-black/40 px-2 py-0.5 rounded-full border border-amber-500/20">
          {messages.length} tin
        </span>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1 text-xs custom-scrollbar">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-amber-400/50 italic py-6 space-y-1">
            <span className="text-2xl not-italic">🧧</span>
            <p>Chưa có tin nhắn nào.</p>
            <p className="text-[11px] text-amber-400/40">Gửi lời chúc Tết hoặc thả sticker troll bạn bè ngay!</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.senderId === currentPlayer.id;
            const stickerImg = msg.stickerId ? getStickerImage(msg.stickerId) : null;
            const isSingleEmoji = msg.text && msg.text.trim().length <= 4 && /^\p{Emoji}+$/u.test(msg.text.trim());

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
              >
                <span className="text-[10px] text-amber-400/70 font-bold mb-0.5 px-1 flex items-center gap-1">
                  {msg.senderNickname}
                  {isMe && <span className="text-[8px] text-amber-300">(Bạn)</span>}
                </span>

                <div
                  className={`px-3 py-1.5 rounded-2xl max-w-[88%] break-words shadow-md ${
                    isMe
                      ? 'bg-gradient-to-r from-amber-600 to-amber-700 text-white rounded-tr-none border border-amber-400/40'
                      : 'bg-red-950/80 text-amber-100 border border-amber-500/30 rounded-tl-none'
                  }`}
                >
                  {/* Sticker Graphic */}
                  {stickerImg && (
                    <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-xl overflow-hidden shadow-inner border border-amber-400/50 bg-black/40 my-1">
                      <img
                        src={stickerImg}
                        alt="Sticker"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}

                  {/* Message Text / Big Emoji */}
                  {msg.text && (
                    <span className={isSingleEmoji && !stickerImg ? 'text-2xl sm:text-3xl' : 'text-xs font-medium'}>
                      {msg.text}
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick 1-Tap Reaction Bar */}
      <div className="flex items-center justify-between py-1 px-1 my-1 border-t border-amber-500/15">
        <span className="text-[10px] font-bold text-amber-300/70">Thả nhanh:</span>
        <div className="flex items-center space-x-1 sm:space-x-1.5">
          {QUICK_REACTIONS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => handleQuickReaction(emoji)}
              className="text-base sm:text-lg hover:scale-125 transition active:scale-95 p-0.5 rounded-full hover:bg-white/10"
              title={`Gửi ${emoji}`}
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>

      {/* Floating Emoji & Sticker Picker Popup */}
      <AnimatePresence>
        {showPicker && (
          <motion.div
            initial={{ opacity: 0, y: 15, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 15, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute bottom-14 left-2 right-2 bg-gradient-to-b from-red-950 via-tet-card to-black border-2 border-amber-400/80 rounded-2xl shadow-2xl p-2.5 z-40 max-h-56 flex flex-col overflow-hidden"
          >
            {/* Picker Header Tabs */}
            <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-amber-500/30">
              <div className="flex space-x-2">
                <button
                  onClick={() => setActiveTab('stickers')}
                  className={`text-xs font-black px-2.5 py-1 rounded-full transition ${
                    activeTab === 'stickers'
                      ? 'bg-amber-500 text-red-950 shadow'
                      : 'text-amber-300 hover:text-amber-100'
                  }`}
                >
                  🎭 Sticker Bựa Cute
                </button>
                <button
                  onClick={() => setActiveTab('emojis')}
                  className={`text-xs font-black px-2.5 py-1 rounded-full transition ${
                    activeTab === 'emojis'
                      ? 'bg-amber-500 text-red-950 shadow'
                      : 'text-amber-300 hover:text-amber-100'
                  }`}
                >
                  😎 Emoji Meme
                </button>
              </div>

              <button
                onClick={() => setShowPicker(false)}
                className="text-amber-400/70 hover:text-amber-200 p-1 rounded-full hover:bg-white/10 transition"
              >
                <X size={14} />
              </button>
            </div>

            {/* Tab 1: Meme Stickers Grid */}
            {activeTab === 'stickers' && (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 overflow-y-auto max-h-40 p-1 custom-scrollbar">
                {MEME_STICKERS.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => handleSendSticker(s)}
                    className="flex flex-col items-center p-1.5 rounded-xl bg-black/50 hover:bg-amber-900/40 border border-amber-500/30 hover:border-amber-400 transition hover:scale-105 active:scale-95 group text-center"
                  >
                    <div className="w-12 h-12 rounded-lg overflow-hidden border border-amber-500/40 shadow bg-black/30 mb-1">
                      <img
                        src={s.image}
                        alt={s.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition duration-200"
                      />
                    </div>
                    <span className="text-[9px] font-black text-amber-200 truncate w-full">
                      {s.name}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {/* Tab 2: Emoji Grid */}
            {activeTab === 'emojis' && (
              <div className="grid grid-cols-6 sm:grid-cols-8 gap-1.5 overflow-y-auto max-h-40 p-1 text-xl sm:text-2xl text-center custom-scrollbar">
                {TROLL_EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => handleInsertEmoji(emoji)}
                    className="hover:bg-amber-500/20 p-1 rounded-lg transition active:scale-90"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input Bar */}
      <form onSubmit={handleSend} className="flex items-center space-x-1.5 pt-1.5 border-t border-amber-500/20">
        {/* Toggle Picker Button */}
        <button
          type="button"
          onClick={() => setShowPicker((prev) => !prev)}
          className={`p-2 rounded-xl border transition active:scale-95 ${
            showPicker
              ? 'bg-amber-500 text-red-950 border-amber-400 shadow-gold-glow'
              : 'bg-black/60 hover:bg-black/80 text-amber-400 border-amber-500/40'
          }`}
          title="Chọn Sticker / Emoji"
        >
          <Smile size={16} />
        </button>

        {/* Text Input */}
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Nhắn tin hoặc chọn emoji..."
          className="flex-1 bg-black/60 border border-amber-500/40 rounded-xl px-3 py-1.5 text-xs text-amber-100 placeholder:text-amber-500/40 focus:outline-none focus:border-amber-400"
          maxLength={100}
        />

        {/* Send Button */}
        <button
          type="submit"
          className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-red-950 p-2 rounded-xl transition shadow active:scale-95 font-bold"
          title="Gửi"
        >
          <Send size={15} />
        </button>
      </form>
    </div>
  );
};
