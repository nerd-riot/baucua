'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage, Player } from '@bau-cua/types';
import { MessageSquare, Send } from 'lucide-react';
import { sound } from '@/lib/sound';

interface ChatBoxProps {
  messages: ChatMessage[];
  currentPlayer: Player;
  onSendMessage: (text?: string, stickerId?: string) => void;
}

const QUICK_STICKERS = [
  { id: 'luck', label: 'Chúc may mắn! 🧧' },
  { id: 'play', label: 'Cùng chơi nhé! 🎉' },
  { id: 'win', label: 'Thật tuyệt vời! 🌟' },
  { id: 'big_win', label: 'Tết này thắng lớn! 💰' },
];

export const ChatBox: React.FC<ChatBoxProps> = ({
  messages,
  currentPlayer,
  onSendMessage,
}) => {
  const [text, setText] = useState('');
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
  };

  return (
    <div className="bg-gradient-to-b from-red-950/90 to-black/90 rounded-2xl border border-amber-500/30 p-3 shadow-royal flex flex-col h-64 sm:h-72 w-full">
      {/* Header */}
      <div className="flex items-center space-x-1.5 pb-2 mb-2 border-b border-amber-500/20 text-xs sm:text-sm font-bold text-amber-300">
        <MessageSquare size={16} className="text-amber-400" />
        <span>Trò Chuyện & Lời Chúc Tết</span>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1 text-xs">
        {messages.length === 0 ? (
          <div className="text-center text-amber-400/40 italic py-6">
            Chưa có tin nhắn nào. Hãy gửi lời chúc may mắn đến mọi người!
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.senderId === currentPlayer.id;
            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
              >
                <span className="text-[10px] text-amber-400/70 font-semibold mb-0.5">
                  {msg.senderNickname}
                </span>
                <div
                  className={`px-3 py-1.5 rounded-2xl max-w-[85%] break-words ${
                    isMe
                      ? 'bg-gradient-to-r from-amber-600 to-amber-700 text-white rounded-tr-none'
                      : 'bg-red-900/60 text-amber-100 border border-amber-500/20 rounded-tl-none'
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Stickers Bar */}
      <div className="flex items-center space-x-1 overflow-x-auto py-1.5 my-1 no-scrollbar">
        {QUICK_STICKERS.map((s) => (
          <button
            key={s.id}
            onClick={() => {
              sound.playChip();
              onSendMessage(s.label);
            }}
            className="whitespace-nowrap bg-black/50 hover:bg-amber-900/50 text-[10px] text-amber-300 border border-amber-500/30 rounded-full px-2.5 py-1 transition active:scale-95"
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Input bar */}
      <form onSubmit={handleSend} className="flex items-center space-x-2 pt-1 border-t border-amber-500/20">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Nhập tin nhắn chúc mừng..."
          className="flex-1 bg-black/60 border border-amber-500/40 rounded-xl px-3 py-1.5 text-xs text-amber-100 placeholder:text-amber-500/40 focus:outline-none focus:border-amber-400"
          maxLength={100}
        />
        <button
          type="submit"
          className="bg-amber-500 hover:bg-amber-400 text-red-950 p-2 rounded-xl transition shadow active:scale-95"
          title="Gửi"
        >
          <Send size={14} />
        </button>
      </form>
    </div>
  );
};
