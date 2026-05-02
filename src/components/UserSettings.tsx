import React, { useState } from "react";
import {
  X,
  LogOut,
  UserX,
  Settings,
  User as UserIcon,
  Mail,
  AlertTriangle,
  Bell,
  BellOff,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { User } from "firebase/auth";

interface UserSettingsProps {
  user: User;
  onClose: () => void;
  onLogout: () => Promise<void>;
  onDeleteAccount: () => Promise<void>;
  notificationsEnabled: boolean;
  onToggleNotifications: () => Promise<void>;
}

export const UserSettings: React.FC<UserSettingsProps> = ({
  user,
  onClose,
  onLogout,
  onDeleteAccount,
  notificationsEnabled,
  onToggleNotifications,
}) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteConfirm = async () => {
    setIsDeleting(true);
    try {
      await onDeleteAccount();
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 40, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-6 border-b border-stone-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-stone-100 rounded-xl">
                <Settings className="w-6 h-6 text-stone-900" />
              </div>
              <div>
                <h2 className="text-xl font-serif italic text-stone-900">설정</h2>
                <p className="text-xs text-stone-400 uppercase tracking-widest font-bold">Settings</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-stone-100 rounded-full transition-colors"
            >
              <X className="w-6 h-6 text-stone-400" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Profile */}
            <section className="space-y-3">
              <h3 className="text-xs font-bold text-stone-400 uppercase tracking-widest">계정 정보</h3>
              <div className="bg-stone-50 rounded-2xl p-4 space-y-2">
                {user.displayName && (
                  <div className="flex items-center gap-3 text-sm text-stone-700">
                    <UserIcon className="w-4 h-4 text-stone-400 shrink-0" />
                    <span>{user.displayName}</span>
                  </div>
                )}
                {user.email && (
                  <div className="flex items-center gap-3 text-sm text-stone-500">
                    <Mail className="w-4 h-4 text-stone-400 shrink-0" />
                    <span>{user.email}</span>
                  </div>
                )}
              </div>
            </section>

            {/* Notifications */}
            <section className="space-y-3">
              <h3 className="text-xs font-bold text-stone-400 uppercase tracking-widest">알림</h3>
              <button
                onClick={onToggleNotifications}
                className="w-full flex items-center justify-between p-4 bg-stone-50 hover:bg-stone-100 rounded-2xl transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  {notificationsEnabled
                    ? <Bell className="w-5 h-5 text-stone-900" />
                    : <BellOff className="w-5 h-5 text-stone-400" />
                  }
                  <div>
                    <p className="text-sm font-semibold text-stone-700">할 일 알림</p>
                    <p className="text-xs text-stone-400">
                      {notificationsEnabled ? "알림이 켜져 있습니다" : "알림이 꺼져 있습니다"}
                    </p>
                  </div>
                </div>
                <div className={`w-10 h-6 rounded-full transition-colors relative ${notificationsEnabled ? "bg-stone-900" : "bg-stone-200"}`}>
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${notificationsEnabled ? "translate-x-5" : "translate-x-1"}`} />
                </div>
              </button>
            </section>

            {/* Account actions */}
            <section className="space-y-3">
              <h3 className="text-xs font-bold text-stone-400 uppercase tracking-widest">계정 관리</h3>
              <button
                onClick={async () => { await onLogout(); onClose(); }}
                className="w-full flex items-center gap-3 p-4 bg-stone-50 hover:bg-stone-100 rounded-2xl transition-colors text-left"
              >
                <LogOut className="w-5 h-5 text-stone-500" />
                <div>
                  <p className="text-sm font-semibold text-stone-700">로그아웃</p>
                  <p className="text-xs text-stone-400">현재 기기에서 로그아웃합니다</p>
                </div>
              </button>
            </section>

            {/* Danger zone */}
            <section className="space-y-3">
              <h3 className="text-xs font-bold text-red-400 uppercase tracking-widest">위험 구역</h3>
              {!showDeleteConfirm ? (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="w-full flex items-center gap-3 p-4 bg-red-50 hover:bg-red-100 rounded-2xl transition-colors text-left border border-red-100"
                >
                  <UserX className="w-5 h-5 text-red-400" />
                  <div>
                    <p className="text-sm font-semibold text-red-600">계정 삭제</p>
                    <p className="text-xs text-red-400">모든 데이터가 영구 삭제됩니다</p>
                  </div>
                </button>
              ) : (
                <div className="bg-red-50 border border-red-200 rounded-2xl p-4 space-y-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                    <div className="space-y-1 text-sm text-red-700">
                      <p className="font-semibold">정말 삭제하시겠습니까?</p>
                      <ul className="text-xs text-red-500 space-y-1 list-disc list-inside">
                        <li>모든 카테고리와 할 일이 삭제됩니다</li>
                        <li>소유한 가족 그룹이 해산됩니다</li>
                        <li>이 작업은 되돌릴 수 없습니다</li>
                      </ul>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowDeleteConfirm(false)}
                      className="flex-1 py-2 px-3 bg-white border border-stone-200 rounded-xl text-sm font-medium text-stone-600 hover:bg-stone-50 transition-colors"
                    >
                      취소
                    </button>
                    <button
                      onClick={handleDeleteConfirm}
                      disabled={isDeleting}
                      className="flex-1 py-2 px-3 bg-red-500 hover:bg-red-600 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
                    >
                      {isDeleting ? "삭제 중..." : "삭제 확인"}
                    </button>
                  </div>
                </div>
              )}
            </section>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
