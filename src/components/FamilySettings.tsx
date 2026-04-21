import React, { useState } from "react";
import { useFamily } from "../contexts/FamilyContext.js";
import { 
  Users, 
  Plus, 
  UserPlus, 
  Copy, 
  Check, 
  X,
  Shield,
  User as UserIcon,
  Loader2
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import { auth } from "../firebase.js";

interface FamilySettingsProps {
  onClose: () => void;
}

export const FamilySettings: React.FC<FamilySettingsProps> = ({ onClose }) => {
  const { families, loading, createFamily, joinFamily, generateInvite } = useFamily();
  const [newFamilyName, setNewFamilyName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [activeInviteCode, setActiveInviteCode] = useState<{ [key: string]: string }>({});
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFamilyName.trim()) return;
    setIsCreating(true);
    try {
      await createFamily(newFamilyName.trim());
      setNewFamilyName("");
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCode.trim()) return;
    setIsJoining(true);
    try {
      await joinFamily(inviteCode.trim());
      setInviteCode("");
    } finally {
      setIsJoining(false);
    }
  };

  const handleGenerateInvite = async (familyId: string) => {
    try {
      const code = await generateInvite(familyId);
      setActiveInviteCode(prev => ({ ...prev, [familyId]: code }));
    } catch (error) {
      // Error handled in context
    }
  };

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast.success("초대 코드가 복사되었습니다.");
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6 border-b border-stone-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-stone-100 rounded-xl">
              <Users className="w-6 h-6 text-stone-900" />
            </div>
            <div>
              <h2 className="text-xl font-serif italic text-stone-900">Family Sharing</h2>
              <p className="text-xs text-stone-400 uppercase tracking-widest font-bold">Premium Feature</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-stone-100 rounded-full transition-colors">
            <X className="w-6 h-6 text-stone-400" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {/* Create & Join Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <section className="space-y-4">
              <h3 className="text-sm font-bold text-stone-500 uppercase tracking-wider flex items-center gap-2">
                <Plus className="w-4 h-4" />
                새 그룹 만들기
              </h3>
              <form onSubmit={handleCreate} className="space-y-2">
                <input
                  type="text"
                  value={newFamilyName}
                  onChange={e => setNewFamilyName(e.target.value)}
                  placeholder="가족 또는 그룹 이름"
                  className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:ring-2 focus:ring-stone-900 outline-none transition-all"
                />
                <button
                  type="submit"
                  disabled={isCreating || !newFamilyName.trim()}
                  className="w-full bg-stone-900 text-white py-3 rounded-xl text-sm font-bold hover:bg-stone-800 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  생성하기
                </button>
              </form>
            </section>

            <section className="space-y-4">
              <h3 className="text-sm font-bold text-stone-500 uppercase tracking-wider flex items-center gap-2">
                <UserPlus className="w-4 h-4" />
                초대 코드로 참여
              </h3>
              <form onSubmit={handleJoin} className="space-y-2">
                <input
                  type="text"
                  value={inviteCode}
                  onChange={e => setInviteCode(e.target.value.toUpperCase())}
                  placeholder="6자리 초대 코드"
                  maxLength={6}
                  className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:ring-2 focus:ring-stone-900 outline-none transition-all font-mono uppercase"
                />
                <button
                  type="submit"
                  disabled={isJoining || inviteCode.length < 6}
                  className="w-full bg-white border border-stone-200 text-stone-900 py-3 rounded-xl text-sm font-bold hover:bg-stone-50 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isJoining ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                  참여하기
                </button>
              </form>
            </section>
          </div>

          {/* My Families List */}
          <section className="space-y-4">
            <h3 className="text-sm font-bold text-stone-500 uppercase tracking-wider">내 그룹 목록</h3>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-stone-300" />
              </div>
            ) : families.length > 0 ? (
              <div className="space-y-3">
                {families.map(family => (
                  <div key={family.id} className="p-4 bg-stone-50 border border-stone-200 rounded-2xl space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white border border-stone-200 rounded-xl flex items-center justify-center">
                          <Users className="w-5 h-5 text-stone-600" />
                        </div>
                        <div>
                          <h4 className="font-serif italic text-lg text-stone-900">{family.name}</h4>
                          <p className="text-[10px] text-stone-400 uppercase tracking-widest font-bold">
                            {family.members.length} Members
                          </p>
                        </div>
                      </div>
                      {family.ownerId === auth.currentUser?.uid && (
                        <button
                          onClick={() => handleGenerateInvite(family.id)}
                          className="text-xs font-bold text-stone-500 hover:text-stone-900 transition-colors flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3" />
                          초대 코드 생성
                        </button>
                      )}
                    </div>

                    <AnimatePresence>
                      {activeInviteCode[family.id] && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="p-3 bg-white border border-stone-200 rounded-xl flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-stone-400 font-bold uppercase">Invite Code:</span>
                              <span className="font-mono font-bold text-stone-900 tracking-wider">{activeInviteCode[family.id]}</span>
                            </div>
                            <button
                              onClick={() => copyToClipboard(activeInviteCode[family.id])}
                              className="p-1.5 hover:bg-stone-50 rounded-lg transition-colors"
                            >
                              {copiedCode === activeInviteCode[family.id] ? (
                                <Check className="w-4 h-4 text-green-500" />
                              ) : (
                                <Copy className="w-4 h-4 text-stone-400" />
                              )}
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div className="flex flex-wrap gap-2">
                      {family.members.map(memberId => (
                        <div 
                          key={memberId} 
                          className="flex items-center gap-1.5 px-2 py-1 bg-white border border-stone-100 rounded-lg text-[10px] font-bold text-stone-500"
                        >
                          {memberId === family.ownerId ? <Shield className="w-3 h-3 text-amber-500" /> : <UserIcon className="w-3 h-3" />}
                          {memberId === auth.currentUser?.uid ? "나" : memberId.substring(0, 5)}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-stone-50 border border-dashed border-stone-200 rounded-3xl">
                <p className="text-sm text-stone-400 italic">참여 중인 그룹이 없습니다.</p>
              </div>
            )}
          </section>
        </div>
      </div>
    </motion.div>
  );
};
