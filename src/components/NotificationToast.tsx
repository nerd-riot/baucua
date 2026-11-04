'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, CheckCircle2, Info, PlusCircle, X } from 'lucide-react';
import { sound } from '@/lib/sound';

export interface AppNotification {
  id: string;
  type: 'error' | 'warning' | 'success' | 'info';
  title?: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

interface NotificationToastProps {
  notifications: AppNotification[];
  onDismiss: (id: string) => void;
}

export const NotificationToast: React.FC<NotificationToastProps> = ({
  notifications,
  onDismiss,
}) => {
  return (
    <div className="fixed top-14 left-1/2 -translate-x-1/2 z-[100] flex flex-col items-center gap-2 w-full max-w-md px-4 pointer-events-none select-none">
      <AnimatePresence>
        {notifications.map((item) => {
          const isError = item.type === 'error' || item.type === 'warning';
          const isSuccess = item.type === 'success';

          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: -24, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -16, scale: 0.92 }}
              transition={{ type: 'spring', stiffness: 360, damping: 24 }}
              className={`pointer-events-auto w-full rounded-2xl border-2 p-3.5 shadow-[0_12px_32px_rgba(0,0,0,0.85),0_0_20px_rgba(245,158,11,0.35)] backdrop-blur-md flex items-start gap-3 ${
                isError
                  ? 'bg-gradient-to-r from-red-950/95 via-tet-card to-red-950/95 border-amber-400 text-amber-100'
                  : isSuccess
                  ? 'bg-gradient-to-r from-emerald-950/95 via-emerald-900/90 to-emerald-950/95 border-emerald-400 text-emerald-100'
                  : 'bg-gradient-to-r from-amber-950/95 via-tet-card to-amber-950/95 border-amber-400 text-amber-100'
              }`}
            >
              {/* Icon */}
              <div
                className={`p-2 rounded-xl shrink-0 border ${
                  isError
                    ? 'bg-red-900/70 border-amber-400/50 text-amber-300'
                    : isSuccess
                    ? 'bg-emerald-800/70 border-emerald-400/50 text-emerald-300'
                    : 'bg-amber-900/70 border-amber-400/50 text-amber-300'
                }`}
              >
                {isError ? (
                  <AlertCircle size={20} />
                ) : isSuccess ? (
                  <CheckCircle2 size={20} />
                ) : (
                  <Info size={20} />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                {item.title && (
                  <h4 className="text-xs sm:text-sm font-black uppercase tracking-wide text-amber-300 mb-0.5">
                    {item.title}
                  </h4>
                )}
                <p className="text-xs sm:text-sm font-semibold text-amber-100/95 leading-snug">
                  {item.message}
                </p>

                {item.actionLabel && item.onAction && (
                  <button
                    type="button"
                    onClick={() => {
                      sound.playChip();
                      item.onAction?.();
                      onDismiss(item.id);
                    }}
                    className="mt-2 inline-flex items-center gap-1.5 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-yellow-300 text-red-950 font-black text-xs px-3 py-1.5 rounded-xl shadow transition active:scale-95"
                  >
                    <PlusCircle size={14} />
                    <span>{item.actionLabel}</span>
                  </button>
                )}
              </div>

              {/* Close Button */}
              <button
                type="button"
                onClick={() => {
                  sound.playChip();
                  onDismiss(item.id);
                }}
                className="text-amber-400/70 hover:text-amber-200 p-1 rounded-lg hover:bg-white/10 transition shrink-0"
                aria-label="Đóng thông báo"
              >
                <X size={16} />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};
