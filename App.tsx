import React, { useState, useEffect } from 'react';
import { Project, Expense, ExpenseStatus } from './types';
import { INITIAL_PROJECTS } from './constants';
import { ExpenseForm } from './components/ExpenseForm';
import { ExpenseList } from './components/ExpenseList';
import { AdminLogin } from './components/AdminLogin';
import { Card } from './components/ui/Card';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { User, ShieldCheck, Wallet, ArrowRight, LayoutDashboard } from 'lucide-react';

type ViewMode = 'home' | 'form' | 'admin-dashboard' | 'login';

const App: React.FC = () => {
  // State
  const [view, setView] = useState<ViewMode>('home');
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [projects, setProjects] = useState<Project[]>(INITIAL_PROJECTS);
  const [expenses, setExpenses] = useState<Expense[]>([]);

  // Load from local storage
  useEffect(() => {
    const savedExpenses = localStorage.getItem('ncku_expenses');
    if (savedExpenses) {
      setExpenses(JSON.parse(savedExpenses));
    }
  }, []);

  // Save & Recalculate Logic
  useEffect(() => {
    localStorage.setItem('ncku_expenses', JSON.stringify(expenses));
    
    const newProjects = INITIAL_PROJECTS.map(p => {
      // 1. Spent: NCKU Approved or Paid
      const spent = expenses
        .filter(e => e.projectId === p.id && (e.status === ExpenseStatus.NCKU_APPROVED || e.status === ExpenseStatus.NCKU_PAID))
        .reduce((sum, e) => sum + (e.totalAmount || 0), 0);

      // 2. Pending: Company Approved or Logged
      const pending = expenses
        .filter(e => e.projectId === p.id && (e.status === ExpenseStatus.COMPANY_APPROVED || e.status === ExpenseStatus.NCKU_LOGGED))
        .reduce((sum, e) => sum + (e.totalAmount || 0), 0);

      const remaining = p.budget - spent - pending;
      return { ...p, remaining, spent, pending };
    });
    setProjects(newProjects);
  }, [expenses]);

  const handleSaveExpense = (newExpense: Omit<Expense, 'id'>) => {
    const id = Date.now().toString();
    setExpenses(prev => [...prev, { ...newExpense, id, status: ExpenseStatus.SUBMITTED }]);
    alert("提交成功！資料已儲存。");
    setView('home');
  };

  const handleUpdateStatus = (id: string, status: ExpenseStatus) => {
    setExpenses(prev => prev.map(e => e.id === id ? { ...e, status } : e));
  };

  const handleAddNote = (id: string, note: string) => {
    const timestamp = new Date().toLocaleString('zh-TW', { hour12: false });
    setExpenses(prev => prev.map(e => 
      e.id === id ? { ...e, notes: [...e.notes, `[${timestamp} ${isAdminLoggedIn ? '管理員' : '系統'}] ${note}`] } : e
    ));
  };

  // Dashboard Metrics
  const totalBudget = projects.reduce((acc, p) => acc + p.budget, 0);
  const totalSpent = projects.reduce((acc, p) => acc + p.spent, 0);
  const totalPending = projects.reduce((acc, p) => acc + p.pending, 0);
  const totalRemaining = totalBudget - totalSpent - totalPending;

  const chartData = [
    { name: '已實支', value: totalSpent, color: '#000000' },    // Black
    { name: '流程中', value: totalPending, color: '#F97316' },  // Orange
    { name: '餘額', value: totalRemaining, color: '#E5E7EB' }, // Gray
  ];

  const renderContent = () => {
    switch (view) {
      case 'form':
        return <ExpenseForm projects={projects} onSave={handleSaveExpense} onCancel={() => setView('home')} />;
      case 'login':
        return <AdminLogin onLogin={() => { setIsAdminLoggedIn(true); setView('admin-dashboard'); }} onCancel={() => setView('home')} />;
      case 'admin-dashboard':
        if (!isAdminLoggedIn) { setView('login'); return null; }
        return (
          <div className="space-y-8 animate-fade-in">
             {/* Summary Cards */}
             <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card className="p-6 bg-black text-white border-none shadow-xl">
                   <div className="text-gray-400 text-sm font-bold uppercase tracking-widest mb-2">總可用餘額</div>
                   <div className="text-4xl font-black">${totalRemaining.toLocaleString()}</div>
                </Card>
                <Card className="p-6 border-l-8 border-orange-500">
                   <div className="text-gray-500 text-sm font-bold uppercase tracking-widest mb-2">流程中 (保留)</div>
                   <div className="text-3xl font-bold text-orange-600">${totalPending.toLocaleString()}</div>
                </Card>
                 <Card className="p-6 border-l-8 border-gray-800">
                   <div className="text-gray-500 text-sm font-bold uppercase tracking-widest mb-2">已實支 (扣款)</div>
                   <div className="text-3xl font-bold text-gray-900">${totalSpent.toLocaleString()}</div>
                </Card>
                <Card className="p-6 flex flex-col justify-center items-center text-center">
                    <div className="text-sm text-gray-500 mb-1">整體執行率</div>
                    <div className="text-3xl font-bold text-black">{totalBudget > 0 ? Math.round(((totalSpent + totalPending) / totalBudget) * 100) : 0}%</div>
                </Card>
             </div>

             {/* Usage Rate Bars */}
             <Card className="p-8">
               <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                 <LayoutDashboard size={24}/> 各計畫預算執行率
               </h3>
               <div className="space-y-6">
                 {projects.filter(p => p.budget > 0).map(p => {
                    const used = p.spent + p.pending;
                    const percent = Math.min(100, Math.round((used / p.budget) * 100));
                    return (
                      <div key={p.id}>
                         <div className="flex justify-between mb-1">
                            <span className="font-bold text-gray-800">{p.name}</span>
                            <span className="text-gray-500 text-sm">{percent}% (${used.toLocaleString()} / ${p.budget.toLocaleString()})</span>
                         </div>
                         <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                            <div 
                              className={`h-4 rounded-full ${percent > 90 ? 'bg-red-600' : 'bg-black'}`} 
                              style={{ width: `${percent}%` }}
                            ></div>
                         </div>
                      </div>
                    );
                 })}
               </div>
             </Card>

             <ExpenseList 
                expenses={expenses} 
                projects={projects}
                onUpdateStatus={handleUpdateStatus}
                onAddNote={handleAddNote}
                onLogout={() => { setIsAdminLoggedIn(false); setView('home'); }}
             />
          </div>
        );
      case 'home':
      default:
        return (
          <div className="space-y-12 animate-fade-in py-10">
            <div className="text-center space-y-4">
               <h1 className="text-5xl font-black text-gray-900 tracking-tight">C-Cube Expense</h1>
               <p className="text-xl text-gray-500 font-medium">Internal Expense Management System</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              <button 
                onClick={() => setView('form')}
                className="group relative bg-white border-2 border-black hover:bg-black hover:text-white rounded-xl p-12 transition-all text-center flex flex-col items-center gap-6 shadow-xl"
              >
                <div className="w-20 h-20 bg-orange-500 text-white rounded-full flex items-center justify-center shadow-lg group-hover:bg-white group-hover:text-black transition-colors">
                   <Wallet size={40} />
                </div>
                <div>
                   <h2 className="text-3xl font-bold mb-2">我要報帳</h2>
                   <p className="text-lg opacity-70">輸入發票、提交審核</p>
                </div>
                <ArrowRight className="absolute bottom-8 right-8 opacity-0 group-hover:opacity-100 transition-opacity" size={24} />
              </button>

              <button 
                onClick={() => setView('login')}
                className="group relative bg-gray-100 border-2 border-transparent hover:border-black hover:bg-white rounded-xl p-12 transition-all text-center flex flex-col items-center gap-6"
              >
                <div className="w-20 h-20 bg-gray-300 text-gray-600 rounded-full flex items-center justify-center group-hover:bg-black group-hover:text-white transition-colors">
                   <ShieldCheck size={40} />
                </div>
                <div>
                   <h2 className="text-3xl font-bold text-gray-800 mb-2">管理後台</h2>
                   <p className="text-lg text-gray-500">審核與報表 (需密碼)</p>
                </div>
              </button>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900 selection:bg-orange-200">
      <nav className="bg-black text-white p-4 shadow-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity" onClick={() => setView('home')}>
             <div className="w-10 h-10 bg-orange-500 rounded flex items-center justify-center text-white font-bold text-2xl">C</div>
             <div className="hidden sm:block">
               <h1 className="text-xl font-bold tracking-wide">C-Cube Expense</h1>
               <div className="text-xs text-gray-400">Department of Computer Science</div>
             </div>
          </div>
          <div className="flex items-center gap-3">
            {isAdminLoggedIn && (
               <span className="bg-orange-600 text-white px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                 Admin Mode
               </span>
            )}
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto p-6 md:p-12">
        {renderContent()}
      </main>
    </div>
  );
};

export default App;