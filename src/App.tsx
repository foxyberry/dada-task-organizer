import React, { useState, useEffect, useMemo } from 'react';
import { 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged, 
  User 
} from 'firebase/auth';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  orderBy,
  or
} from 'firebase/firestore';
import { auth, db } from './firebase';
import {
  createCategory as createCategoryOnServer,
  deleteCategory as deleteCategoryOnServer,
} from './services/categoryService';
import type { ShoppingItem } from './services/geminiService';
import {
  analyzeAndCreateTask,
  deleteTask as deleteTaskOnServer,
  updateTask as updateTaskOnServer,
} from './services/taskService';
import { apiService } from './services/apiService';
import { useNotification } from './hooks/useNotification';
import { FamilyProvider, useFamily } from './contexts/FamilyContext';
import { FamilySettings } from './components/FamilySettings';
import { UserSettings } from './components/UserSettings';
import {
  Plus,
  Trash2,
  CheckCircle2,
  Circle,
  BrainCircuit,
  LogOut,
  LogIn,
  ChevronRight,
  ChevronDown,
  AlertCircle,
  Loader2,
  Sparkles,
  Calendar,
  Tag,
  ArrowUpCircle,
  ArrowDownCircle,
  MinusCircle,
  Bell,
  BellOff,
  ShoppingCart,
  LayoutList,
  CheckSquare,
  Users,
  Shield,
  Settings
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Toaster, toast } from 'sonner';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function getLoginErrorMessage(error: unknown) {
  const code = typeof error === 'object' && error && 'code' in error ? String((error as { code?: unknown }).code) : '';

  if (code === 'auth/unauthorized-domain') {
    return "Firebase Authentication의 Authorized domains에 localhost를 추가해야 합니다.";
  }

  if (code === 'auth/popup-closed-by-user') {
    return "로그인 창이 닫혔습니다. 다시 시도해주세요.";
  }

  if (code === 'auth/operation-not-allowed') {
    return "Firebase Authentication에서 Google 로그인을 활성화해야 합니다.";
  }

  return "로그인에 실패했습니다.";
}

interface Category {
  id: string;
  name: string;
  userId: string;
  familyId?: string;
  createdAt: any;
}

interface Task {
  id: string;
  title: string;
  description?: string;
  categoryId: string;
  familyId?: string;
  priority: number;
  status: 'pending' | 'completed';
  aiReasoning?: string;
  dueDate?: string;
  reminderTime?: string;
  isShoppingList?: boolean;
  shoppingItems?: ShoppingItem[];
  userId: string;
  createdAt: any;
}

export default function App() {
  return (
    <FamilyProvider>
      <AppContent />
    </FamilyProvider>
  );
}

function AppContent() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newTaskInput, setNewTaskInput] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const [viewMode, setViewMode] = useState<'list' | 'timeline'>('list');
  const [activeTab, setActiveTab] = useState<'tasks' | 'shopping'>('tasks');
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [notifiedTasks, setNotifiedTasks] = useState<Set<string>>(new Set());
  const [showFamilySettings, setShowFamilySettings] = useState(false);
  const [showUserSettings, setShowUserSettings] = useState(false);
  const [selectedFamilyId, setSelectedFamilyId] = useState<string | null>(null);

  const { families } = useFamily();
  const { permission, requestPermission, sendNotification } = useNotification();
  const availableCategoriesForNewTask = useMemo(
    () =>
      categories.filter(category =>
        selectedFamilyId ? category.familyId === selectedFamilyId : !category.familyId
      ),
    [categories, selectedFamilyId]
  );

  // Notification Scheduler
  useEffect(() => {
    if (!notificationsEnabled || permission !== 'granted') return;

    const checkReminders = () => {
      const now = new Date();
      // Both Gemini-written dueDate and reminderTime are in the user's
      // local timezone, so the scheduler must compare in the same zone.
      const userTz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
      const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: userTz }).format(now);
      const currentTimeStr = new Intl.DateTimeFormat('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: userTz,
      }).format(now); // HH:mm

      tasks.forEach(task => {
        if (
          task.status === 'pending' &&
          task.dueDate === todayStr &&
          task.reminderTime === currentTimeStr &&
          !notifiedTasks.has(task.id)
        ) {
          sendNotification(`알림: ${task.title}`, {
            body: task.aiReasoning || '설정된 시간이 되었습니다.',
            tag: task.id
          });
          setNotifiedTasks(prev => new Set(prev).add(task.id));
          toast.info(`알림: ${task.title}`);
        }
      });
    };

    const interval = setInterval(checkReminders, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, [tasks, notificationsEnabled, permission, notifiedTasks, sendNotification]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;

    const familyIds = families.map(f => f.id);
    
    // Categories Query
    const qCat = familyIds.length > 0 
      ? query(collection(db, 'categories'), or(where('userId', '==', user.uid), where('familyId', 'in', familyIds)), orderBy('createdAt', 'desc'))
      : query(collection(db, 'categories'), where('userId', '==', user.uid), orderBy('createdAt', 'desc'));

    const unsubCat = onSnapshot(qCat, (snapshot) => {
      const cats = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category));
      setCategories(cats);
      setExpandedCategories(prev => {
        const next = { ...prev };
        cats.forEach(c => {
          if (next[c.id] === undefined) next[c.id] = true;
        });
        return next;
      });
    }, (error) => {
      console.error("Categories fetch error:", error);
      toast.error("카테고리를 불러오는 중 오류가 발생했습니다.");
    });

    // Tasks Query
    const qTask = familyIds.length > 0
      ? query(collection(db, 'tasks'), or(where('userId', '==', user.uid), where('familyId', 'in', familyIds)), orderBy('priority', 'desc'))
      : query(collection(db, 'tasks'), where('userId', '==', user.uid), orderBy('priority', 'desc'));

    const unsubTask = onSnapshot(qTask, (snapshot) => {
      setTasks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task)));
    }, (error) => {
      console.error("Tasks fetch error:", error);
      toast.error("할 일을 불러오는 중 오류가 발생했습니다.");
    });

    return () => {
      unsubCat();
      unsubTask();
    };
  }, [user, families]);

  const handleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      toast.success("로그인되었습니다.");
    } catch (error) {
      console.error("Login error:", error);
      toast.error(getLoginErrorMessage(error));
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setNotificationsEnabled(false);
      toast.success("로그아웃되었습니다.");
    } catch (error) {
      console.error("Logout error:", error);
      toast.error("로그아웃에 실패했습니다.");
    }
  };

  const handleDeleteAccount = async () => {
    const confirmed = window.confirm(
      "정말 계정을 삭제하시겠습니까?\n\n" +
      "• 모든 카테고리와 할 일이 삭제됩니다\n" +
      "• 가족 그룹 소유자인 경우 그룹이 해산됩니다\n" +
      "• 이 작업은 되돌릴 수 없습니다"
    );
    if (!confirmed) return;

    try {
      await apiService.deleteAccount();
      await signOut(auth);
      toast.success("계정이 삭제되었습니다.");
    } catch (error: any) {
      console.error("Delete account error:", error);
      toast.error(error.message || "계정 삭제에 실패했습니다.");
    }
  };

  const addCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newCategoryName.trim()) return;

    try {
      await createCategoryOnServer({
        name: newCategoryName.trim(),
        familyId: selectedFamilyId || null,
      });
      setNewCategoryName('');
      toast.success("카테고리가 추가되었습니다.");
    } catch (error) {
      console.error("Add category error:", error);
      const message = error instanceof Error ? error.message : "카테고리 추가에 실패했습니다.";
      toast.error(message);
    }
  };

  const deleteCategory = async (id: string) => {
    if (!window.confirm("이 카테고리와 포함된 모든 할 일이 삭제됩니다. 계속하시겠습니까?")) return;
    try {
      await deleteCategoryOnServer(id);
      toast.success("카테고리가 삭제되었습니다.");
    } catch (error) {
      console.error("Delete category error:", error);
      const message = error instanceof Error ? error.message : "카테고리 삭제에 실패했습니다.";
      toast.error(message);
    }
  };

  const processNewTask = async () => {
    if (!user || !newTaskInput.trim()) return;
    if (availableCategoriesForNewTask.length === 0) {
      toast.error(
        selectedFamilyId
          ? "이 가족 그룹에 카테고리를 하나 이상 만들어주세요."
          : "먼저 개인 카테고리를 하나 이상 만들어주세요."
      );
      return;
    }

    setIsAnalyzing(true);
    try {
      const createdTask = await analyzeAndCreateTask({
        input: newTaskInput,
        familyId: selectedFamilyId || null,
      });

      if (createdTask.isShoppingList) {
        setActiveTab('shopping');
      }

      setNewTaskInput('');
      toast.success("할 일이 추가되었습니다!");
    } catch (error) {
      console.error("Process task error:", error);
      const message = error instanceof Error ? error.message : "할 일 추가 중 오류가 발생했습니다.";
      toast.error(message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const toggleTaskStatus = async (task: Task) => {
    try {
      await updateTaskOnServer(task.id, {
        status: task.status === 'pending' ? 'completed' : 'pending'
      });
    } catch (error) {
      console.error("Toggle task error:", error);
      const message = error instanceof Error ? error.message : "상태 변경에 실패했습니다.";
      toast.error(message);
    }
  };

  const toggleShoppingItem = async (taskId: string, itemIndex: number) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task || !task.shoppingItems) return;

    const newItems = [...task.shoppingItems];
    newItems[itemIndex] = { ...newItems[itemIndex], checked: !newItems[itemIndex].checked };

    try {
      await updateTaskOnServer(taskId, {
        shoppingItems: newItems
      });
    } catch (error) {
      console.error("Toggle shopping item error:", error);
      const message = error instanceof Error ? error.message : "품목 상태 변경에 실패했습니다.";
      toast.error(message);
    }
  };

  const deleteTask = async (id: string) => {
    try {
      await deleteTaskOnServer(id);
      toast.success("할 일이 삭제되었습니다.");
    } catch (error) {
      console.error("Delete task error:", error);
      const message = error instanceof Error ? error.message : "삭제에 실패했습니다.";
      toast.error(message);
    }
  };

  const toggleCategoryExpand = (id: string) => {
    setExpandedCategories(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleNotifications = async () => {
    if (!notificationsEnabled) {
      const result = await requestPermission();
      if (result === 'granted') {
        setNotificationsEnabled(true);
        toast.success("알림이 활성화되었습니다.");
      } else {
        toast.error("알림 권한이 거부되었습니다. 브라우저 설정을 확인해주세요.");
      }
    } else {
      setNotificationsEnabled(false);
      toast.info("알림이 비활성화되었습니다.");
    }
  };

  const groupedTasks = useMemo(() => {
    const groups: Record<string, Task[]> = {};
    tasks.forEach(task => {
      if (!groups[task.categoryId]) groups[task.categoryId] = [];
      groups[task.categoryId].push(task);
    });
    return groups;
  }, [tasks]);

  const timelineTasks = useMemo(() => {
    const groups: Record<string, Task[]> = {};
    tasks.forEach(task => {
      const dateKey = task.dueDate || '언제든';
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(task);
    });
    // Sort dates
    return Object.keys(groups)
      .sort((a, b) => {
        if (a === '언제든') return 1;
        if (b === '언제든') return -1;
        return a.localeCompare(b);
      })
      .reduce((acc, key) => {
        acc[key] = groups[key].sort((a, b) => b.priority - a.priority);
        return acc;
      }, {} as Record<string, Task[]>);
  }, [tasks]);

  const getPriorityIcon = (priority: number) => {
    if (priority >= 4) return <ArrowUpCircle className="w-4 h-4 text-red-500" />;
    if (priority <= 2) return <ArrowDownCircle className="w-4 h-4 text-blue-500" />;
    return <MinusCircle className="w-4 h-4 text-amber-500" />;
  };

  const getPriorityLabel = (priority: number) => {
    if (priority === 5) return "최우선";
    if (priority === 4) return "높음";
    if (priority === 3) return "보통";
    if (priority === 2) return "낮음";
    return "최하";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-stone-400" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center p-6 text-center">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full space-y-8"
        >
          <div className="space-y-4">
            <div className="w-20 h-20 bg-stone-900 rounded-3xl flex items-center justify-center mx-auto shadow-xl">
              <BrainCircuit className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl font-serif italic text-stone-900">AI Task Organizer</h1>
            <p className="text-stone-500 font-sans">
              생각나는 대로 말하세요. <br />
              AI가 알아서 분류하고 우선순위를 정해드립니다.
            </p>
          </div>
          <button
            onClick={handleLogin}
            className="w-full flex items-center justify-center gap-3 bg-white border border-stone-200 p-4 rounded-2xl shadow-sm hover:shadow-md transition-all text-stone-700 font-medium"
          >
            <LogIn className="w-5 h-5" />
            Google 계정으로 시작하기
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 font-sans pb-20">
      <Toaster position="top-center" richColors />
      
      {/* Header */}
      <header className="sticky top-0 z-30 bg-stone-50/80 backdrop-blur-md border-b border-stone-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <BrainCircuit className="w-6 h-6 text-stone-900" />
            <span className="font-serif italic text-xl">AI Organizer</span>
          </div>
          
          <nav className="hidden md:flex items-center bg-stone-100 p-1 rounded-2xl">
            <button
              onClick={() => setActiveTab('tasks')}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all",
                activeTab === 'tasks' ? "bg-white shadow-sm text-stone-900" : "text-stone-500 hover:text-stone-700"
              )}
            >
              <LayoutList className="w-4 h-4" />
              Tasks
            </button>
            <button
              onClick={() => setActiveTab('shopping')}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all",
                activeTab === 'shopping' ? "bg-white shadow-sm text-stone-900" : "text-stone-500 hover:text-stone-700"
              )}
            >
              <ShoppingCart className="w-4 h-4" />
              Shopping
            </button>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowFamilySettings(true)}
            className={cn(
              "p-2 rounded-full transition-all relative",
              families.length > 0 ? "bg-stone-900 text-white" : "bg-stone-200 text-stone-500 hover:bg-stone-300"
            )}
            title="가족 공유 설정"
          >
            <Users className="w-5 h-5" />
            {families.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 rounded-full border-2 border-stone-50 text-[8px] flex items-center justify-center font-bold">
                {families.length}
              </span>
            )}
          </button>
          <div className="flex bg-stone-200 p-1 rounded-xl">
            <button 
              onClick={() => setViewMode('list')}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                viewMode === 'list' ? "bg-white shadow-sm text-stone-900" : "text-stone-500 hover:text-stone-700"
              )}
            >
              List
            </button>
            <button 
              onClick={() => setViewMode('timeline')}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                viewMode === 'timeline' ? "bg-white shadow-sm text-stone-900" : "text-stone-500 hover:text-stone-700"
              )}
            >
              Timeline
            </button>
          </div>
          <button
            onClick={() => setShowUserSettings(true)}
            className="p-2 hover:bg-stone-200 rounded-full transition-colors"
            title="설정"
          >
            <Settings className="w-5 h-5 text-stone-500" />
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-12">
        
        {/* Mobile Tab Switcher */}
        <div className="md:hidden flex bg-stone-100 p-1 rounded-2xl">
          <button
            onClick={() => setActiveTab('tasks')}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold transition-all",
              activeTab === 'tasks' ? "bg-white shadow-sm text-stone-900" : "text-stone-500"
            )}
          >
            <LayoutList className="w-4 h-4" />
            Tasks
          </button>
          <button
            onClick={() => setActiveTab('shopping')}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold transition-all",
              activeTab === 'shopping' ? "bg-white shadow-sm text-stone-900" : "text-stone-500"
            )}
          >
            <ShoppingCart className="w-4 h-4" />
            Shopping
          </button>
        </div>

        {/* Input Section */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-stone-400">
              <Sparkles className="w-4 h-4" />
              <h2 className="text-xs uppercase tracking-widest font-bold">New Thought</h2>
            </div>
            
            {families.length > 0 && (
              <div className="flex items-center gap-2 bg-stone-100 p-1 rounded-xl">
                <button
                  onClick={() => setSelectedFamilyId(null)}
                  className={cn(
                    "px-3 py-1 rounded-lg text-[10px] font-bold transition-all",
                    !selectedFamilyId ? "bg-white shadow-sm text-stone-900" : "text-stone-500"
                  )}
                >
                  개인
                </button>
                {families.map(f => (
                  <button
                    key={f.id}
                    onClick={() => setSelectedFamilyId(f.id)}
                    className={cn(
                      "px-3 py-1 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1",
                      selectedFamilyId === f.id ? "bg-white shadow-sm text-stone-900" : "text-stone-500"
                    )}
                  >
                    <Users className="w-3 h-3" />
                    {f.name}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="relative group">
            <textarea
              value={newTaskInput}
              onChange={(e) => setNewTaskInput(e.target.value)}
              placeholder="무엇을 해야 하나요? 생각나는 대로 적어보세요..."
              className="w-full min-h-[120px] p-6 bg-white border border-stone-200 rounded-3xl shadow-sm focus:ring-2 focus:ring-stone-900 focus:border-transparent transition-all resize-none text-lg"
              disabled={isAnalyzing}
            />
            <button
              onClick={processNewTask}
              disabled={isAnalyzing || !newTaskInput.trim()}
              className={cn(
                "absolute bottom-4 right-4 p-4 rounded-2xl transition-all flex items-center gap-2 font-bold",
                isAnalyzing || !newTaskInput.trim() 
                  ? "bg-stone-100 text-stone-400 cursor-not-allowed" 
                  : "bg-stone-900 text-white hover:scale-105 shadow-lg"
              )}
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  분석 중...
                </>
              ) : (
                <>
                  <Plus className="w-5 h-5" />
                  추가하기
                </>
              )}
            </button>
          </div>
        </section>

        {/* Categories & Tasks */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
          
          {/* Sidebar: Categories Management */}
          <aside className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-stone-400">
                <Tag className="w-4 h-4" />
                <h2 className="text-xs uppercase tracking-widest font-bold">Categories</h2>
              </div>
              
              <form onSubmit={addCategory} className="flex gap-2">
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="새 카테고리..."
                  className="flex-1 bg-white border border-stone-200 px-4 py-2 rounded-xl text-sm focus:ring-1 focus:ring-stone-900 outline-none"
                />
                <button 
                  type="submit"
                  disabled={!newCategoryName.trim()}
                  className="p-2 bg-stone-900 text-white rounded-xl disabled:opacity-50"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </form>

              <div className="space-y-1">
                {categories.map((cat) => (
                  <div 
                    key={cat.id}
                    className="group flex items-center justify-between p-3 rounded-xl hover:bg-stone-200 transition-colors cursor-pointer"
                    onClick={() => toggleCategoryExpand(cat.id)}
                  >
                    <div className="flex items-center gap-3">
                      {expandedCategories[cat.id] ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      <span className="text-sm font-medium">{cat.name}</span>
                      <span className="text-[10px] bg-stone-300 px-1.5 py-0.5 rounded-full text-stone-600">
                        {groupedTasks[cat.id]?.length || 0}
                      </span>
                    </div>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteCategory(cat.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                {categories.length === 0 && (
                  <p className="text-xs text-stone-400 text-center py-4">카테고리가 없습니다.</p>
                )}
              </div>
            </div>
          </aside>

          {/* Main Content: Task List */}
          <div className="md:col-span-2 space-y-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-8"
              >
                <div className="flex items-center gap-2 text-stone-400">
                  {activeTab === 'tasks' ? (
                    viewMode === 'list' ? <Calendar className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />
                  ) : (
                    <ShoppingCart className="w-4 h-4" />
                  )}
                  <h2 className="text-xs uppercase tracking-widest font-bold">
                    {activeTab === 'tasks' 
                      ? (viewMode === 'list' ? 'Your Tasks' : 'Timeline View')
                      : 'Shopping Lists'}
                  </h2>
                </div>

                <div className="space-y-12">
                  {activeTab === 'tasks' ? (
                    viewMode === 'list' ? (
                      categories.map((cat) => (
                        <AnimatePresence key={cat.id}>
                          {expandedCategories[cat.id] && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              className="space-y-4 overflow-hidden"
                            >
                              <div className="flex items-center gap-4">
                                <h3 className="font-serif italic text-2xl text-stone-800">{cat.name}</h3>
                                <div className="h-px flex-1 bg-stone-200" />
                              </div>

                              <div className="space-y-3">
                                {groupedTasks[cat.id]?.filter(t => !t.isShoppingList).length ? (
                                  groupedTasks[cat.id].filter(t => !t.isShoppingList).map((task) => (
                                    <TaskCard 
                                      key={task.id} 
                                      task={task} 
                                      onToggle={() => toggleTaskStatus(task)} 
                                      onDelete={() => deleteTask(task.id)} 
                                    />
                                  ))
                                ) : (
                                  <p className="text-sm text-stone-400 italic py-2">이 카테고리에 할 일이 없습니다.</p>
                                )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      ))
                    ) : (
                      Object.entries(timelineTasks).map(([date, dateTasks]) => {
                        const filteredTasks = dateTasks.filter(t => !t.isShoppingList);
                        if (filteredTasks.length === 0) return null;
                        return (
                          <div key={date} className="space-y-6 relative pl-8 border-l border-stone-200">
                            <div className="absolute -left-1.5 top-2 w-3 h-3 rounded-full bg-stone-900 border-2 border-stone-50" />
                            <div className="space-y-1">
                              <h3 className="font-serif italic text-2xl text-stone-800">
                                {date === '언제든' ? '언제든지' : date}
                              </h3>
                              <p className="text-[10px] text-stone-400 uppercase tracking-widest font-bold">
                                {filteredTasks.length} Tasks
                              </p>
                            </div>
                            <div className="space-y-3">
                              {filteredTasks.map((task) => (
                                <TaskCard 
                                  key={task.id} 
                                  task={task} 
                                  onToggle={() => toggleTaskStatus(task)} 
                                  onDelete={() => deleteTask(task.id)} 
                                  showCategory
                                  categories={categories}
                                />
                              ))}
                            </div>
                          </div>
                        );
                      })
                    )
                  ) : (
                    <div className="space-y-6">
                      {tasks.filter(t => t.isShoppingList).length ? (
                        tasks.filter(t => t.isShoppingList).map((task) => (
                          <TaskCard 
                            key={task.id} 
                            task={task} 
                            onToggle={() => toggleTaskStatus(task)} 
                            onDelete={() => deleteTask(task.id)} 
                            showCategory
                            categories={categories}
                            onToggleShoppingItem={(idx) => toggleShoppingItem(task.id, idx)}
                          />
                        ))
                      ) : (
                        <div className="text-center py-20 bg-white border border-dashed border-stone-300 rounded-3xl space-y-4">
                          <div className="w-12 h-12 bg-stone-100 rounded-full flex items-center justify-center mx-auto">
                            <ShoppingCart className="w-6 h-6 text-stone-400" />
                          </div>
                          <div className="space-y-1">
                            <p className="font-medium text-stone-600">장보기 목록이 없습니다</p>
                            <p className="text-sm text-stone-400">"계란이랑 우유 사야해" 같이 입력해보세요.</p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {categories.length === 0 && (
                    <div className="text-center py-20 bg-white border border-dashed border-stone-300 rounded-3xl space-y-4">
                      <div className="w-12 h-12 bg-stone-100 rounded-full flex items-center justify-center mx-auto">
                        <Plus className="w-6 h-6 text-stone-400" />
                      </div>
                      <div className="space-y-1">
                        <p className="font-medium text-stone-600">카테고리를 먼저 만들어주세요</p>
                        <p className="text-sm text-stone-400">왼쪽 사이드바에서 카테고리를 추가할 수 있습니다.</p>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </main>

      {/* Footer Info */}
      <footer className="max-w-4xl mx-auto px-6 py-12 border-t border-stone-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-stone-400 text-xs uppercase tracking-widest font-bold">
        <p>© 2026 AI Task Organizer</p>
        <div className="flex items-center gap-6">
          <span className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            AI Powered
          </span>
          <span className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-500" />
            Cloud Synced
          </span>
        </div>
      </footer>

      <AnimatePresence>
        {showFamilySettings && (
          <FamilySettings onClose={() => setShowFamilySettings(false)} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showUserSettings && (
          <UserSettings
            user={user}
            onClose={() => setShowUserSettings(false)}
            onLogout={handleLogout}
            onDeleteAccount={handleDeleteAccount}
            notificationsEnabled={notificationsEnabled}
            onToggleNotifications={toggleNotifications}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

interface TaskCardProps {
  task: Task;
  onToggle: () => void;
  onDelete: () => void;
  showCategory?: boolean;
  categories?: Category[];
  onToggleShoppingItem?: (index: number) => void;
}

function TaskCard({ task, onToggle, onDelete, showCategory, categories, onToggleShoppingItem }: TaskCardProps) {
  const { families } = useFamily();
  
  const getPriorityIcon = (priority: number) => {
    if (priority >= 4) return <ArrowUpCircle className="w-4 h-4 text-red-500" />;
    if (priority <= 2) return <ArrowDownCircle className="w-4 h-4 text-blue-500" />;
    return <MinusCircle className="w-4 h-4 text-amber-500" />;
  };

  const getPriorityLabel = (priority: number) => {
    if (priority === 5) return "최우선";
    if (priority === 4) return "높음";
    if (priority === 3) return "보통";
    if (priority === 2) return "낮음";
    return "최하";
  };

  const categoryName = showCategory && categories 
    ? categories.find(c => c.id === task.categoryId)?.name 
    : null;

  const familyName = task.familyId 
    ? families.find(f => f.id === task.familyId)?.name 
    : null;

  const groupedShoppingItems = useMemo(() => {
    if (!task.shoppingItems) return {};
    const groups: Record<string, ShoppingItem[]> = {};
    task.shoppingItems.forEach((item, idx) => {
      const cat = item.category || '기타';
      if (!groups[cat]) groups[cat] = [];
      // Store original index for toggling
      const itemWithIdx = { ...item, _originalIndex: idx };
      groups[cat].push(itemWithIdx);
    });
    return groups;
  }, [task.shoppingItems]);

  return (
    <motion.div
      layout
      className={cn(
        "group bg-white border border-stone-200 p-5 rounded-3xl shadow-sm hover:shadow-md transition-all flex flex-col gap-4",
        task.status === 'completed' && "opacity-60 grayscale"
      )}
    >
      <div className="flex items-start gap-4">
        <button 
          onClick={onToggle}
          className="mt-1 text-stone-400 hover:text-stone-900 transition-colors"
        >
          {task.status === 'completed' ? (
            <CheckCircle2 className="w-6 h-6 text-green-600" />
          ) : (
            <Circle className="w-6 h-6" />
          )}
        </button>
        
        <div className="flex-1 space-y-2">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                {task.isShoppingList && <ShoppingCart className="w-4 h-4 text-stone-400" />}
                <h4 className={cn(
                  "font-medium text-lg leading-tight",
                  task.status === 'completed' && "line-through text-stone-400"
                )}>
                  {task.title}
                </h4>
                {familyName && (
                  <div className="flex items-center gap-1 px-1.5 py-0.5 bg-amber-50 border border-amber-100 rounded-md text-[8px] font-bold text-amber-600 uppercase tracking-tighter">
                    <Users className="w-2 h-2" />
                    {familyName}
                  </div>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-3">
                {showCategory && categoryName && (
                  <div className="flex items-center gap-1 text-[10px] text-stone-400 font-bold uppercase tracking-widest">
                    <Tag className="w-3 h-3" />
                    {categoryName}
                  </div>
                )}
                {task.dueDate && (
                  <div className="flex items-center gap-1 text-[10px] text-stone-400 font-bold uppercase tracking-widest">
                    <Calendar className="w-3 h-3" />
                    {task.dueDate} {task.reminderTime && `@ ${task.reminderTime}`}
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <div className="flex items-center gap-1.5 px-2 py-1 bg-stone-100 rounded-lg">
                {getPriorityIcon(task.priority)}
                <span className="text-[10px] font-bold uppercase tracking-tighter text-stone-500">
                  {getPriorityLabel(task.priority)}
                </span>
              </div>
              <button 
                onClick={onDelete}
                className="opacity-0 group-hover:opacity-100 p-1 text-stone-400 hover:text-red-500 transition-all"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          {task.aiReasoning && (
            <div className="flex items-start gap-2 bg-stone-50 p-3 rounded-xl border border-stone-100">
              <Sparkles className="w-3 h-3 text-amber-500 mt-1 shrink-0" />
              <p className="text-xs text-stone-500 leading-relaxed italic">
                {task.aiReasoning}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Shopping Items Checklist */}
      {task.isShoppingList && task.shoppingItems && task.shoppingItems.length > 0 && (
        <div className="mt-2 pl-10 space-y-4 border-t border-stone-100 pt-4">
          {Object.entries(groupedShoppingItems).map(([cat, items]) => (
            <div key={cat} className="space-y-2">
              <h5 className="text-[10px] text-stone-400 font-bold uppercase tracking-widest">{cat}</h5>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {items.map((item) => (
                  <button
                    key={(item as any)._originalIndex}
                    onClick={() => onToggleShoppingItem?.((item as any)._originalIndex)}
                    className={cn(
                      "flex items-center gap-2 p-2 rounded-xl transition-all text-left",
                      item.checked ? "bg-stone-50 text-stone-400" : "bg-stone-100 hover:bg-stone-200 text-stone-700"
                    )}
                  >
                    {item.checked ? <CheckSquare className="w-4 h-4 text-green-600" /> : <div className="w-4 h-4 border-2 border-stone-300 rounded" />}
                    <span className={cn("text-sm", item.checked && "line-through")}>{item.name}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
