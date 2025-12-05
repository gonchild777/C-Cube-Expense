import React, { useState, useEffect } from 'react';
import { Project, Expense, ExpenseStatus, ProjectType } from './types';
import { INITIAL_PROJECTS, CATEGORIES, EMPLOYEES } from './constants';
import { ExpenseForm } from './components/ExpenseForm';
import { ExpenseList } from './components/ExpenseList';
import { AdminLogin } from './components/AdminLogin';
import { Card } from './components/ui/Card';
import { Button } from './components/ui/Button';
import { LayoutDashboard, Wallet, ShieldCheck, ArrowRight, Plus, FolderPlus, Settings, History } from 'lucide-react';

type ViewMode = 'home' | 'form' | 'admin-dashboard' | 'login';

const App: React.FC = () => {
  // State
  const [view, setView] = useState<ViewMode>('home');
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [projects, setProjects] = useState<Project[]>(INITIAL_PROJECTS);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [employees, setEmployees] = useState<string[]>(EMPLOYEES);
  
  // Add Project State
  const [showAddProject, setShowAddProject] = useState(false);
  const [newProject, setNewProject] = useState<Partial<Project>>({
     name: '', code: '', type: ProjectType.NSTC, budget: 0, categoryBudgets: {}
  });

  // Adjust Project Budget State
  const [adjustingProject, setAdjustingProject] = useState<string | null>(null);
  const [adjustmentAmount, setAdjustmentAmount] = useState<number>(0);
  const [adjustmentReason, setAdjustmentReason] = useState<string>('');

  // Load from local storage
  useEffect(() => {
    const savedExpenses = localStorage.getItem('ncku_expenses');
    if (savedExpenses) {
      const parsedExpenses: Expense[] = JSON.parse(savedExpenses);
      setExpenses(parsedExpenses);
      
      // Extract unique payer names
      const payers = new Set([...EMPLOYEES]);
      parsedExpenses.forEach(e => {
          if (e.payerName) payers.add(e.payerName);
      });
      setEmployees(Array.from(payers));
    }
  }, []);

  // Save & Recalculate Logic
  useEffect(() => {
    localStorage.setItem('ncku_expenses', JSON.stringify(expenses));
    recalculateBudgets(expenses);
  }, [expenses]); 

  const recalculateBudgets = (currentExpenses: Expense[]) => {
      setProjects(prevProjects => prevProjects.map(p => {
        // Calculate normal expenses
        const expenseSpent = currentExpenses
            .filter(e => e.projectId === p.id && (e.status === ExpenseStatus.NCKU_APPROVED || e.status === ExpenseStatus.NCKU_PAID))
            .reduce((sum, e) => sum + (e.totalAmount || 0), 0);
        
        const expensePending = currentExpenses
            .filter(e => e.projectId === p.id && (e.status === ExpenseStatus.COMPANY_APPROVED || e.status === ExpenseStatus.NCKU_LOGGED))
            .reduce((sum, e) => sum + (e.totalAmount || 0), 0);
            
        // Calculate manual adjustments (treated as spent)
        const manualSpent = p.adjustments ? p.adjustments.reduce((sum, adj) => sum + adj.amount, 0) : 0;
        
        const totalSpent = expenseSpent + manualSpent;
        const remaining = p.budget - totalSpent - expensePending;
        
        return { ...p, remaining, spent: totalSpent, pending: expensePending };
      }));
  };

  const handleSaveExpense = (newExpense: Omit<Expense, 'id'>) => {
    const id = Date.now().toString();
    const updated = [...expenses, { ...newExpense, id, status: ExpenseStatus.SUBMITTED }];
    
    // Update employee list if new name
    if (newExpense.payerName && !employees.includes(newExpense.payerName)) {
        setEmployees(prev => [...prev, newExpense.payerName!]);
    }

    setExpenses(updated);
    alert("提交成功！資料已儲存。");
    setView('home');
  };

  const handleUpdateStatus = (id: string, status: ExpenseStatus) => {
    const updated = expenses.map(e => e.id === id ? { ...e, status } : e);
    setExpenses(updated);
  };

  const handleUpdateExpense = (expense: Expense) => {
      const updated = expenses.map(e => e.id === expense.id ? expense : e);
      setExpenses(updated);
  };

  const handleAddNote = (id: string, note: string) => {
    const timestamp = new Date().toLocaleString('zh-TW', { hour12: false });
    const updated = expenses.map(e => 
      e.id === id ? { ...e, notes: [...e.notes, `[${timestamp} ${isAdminLoggedIn ? '管理員' : '系統'}] ${note}`] } : e
    );
    setExpenses(updated);
  };

  const handleAddProject = () => {
      if(!newProject.name || !newProject.code) return;
      const p: Project = {
          id: `p-${Date.now()}`,
          name: newProject.name || '未命名',
          code: newProject.code || 'N/A',
          type: newProject.type || ProjectType.NSTC,
          budget: newProject.budget || 0,
          categoryBudgets: newProject.categoryBudgets || {},
          remaining: newProject.budget || 0,
          pending: 0,
          spent: 0,
          allowedCategories: ['office', 'travel', 'equipment', 'meal', 'consumable', 'maintenance'],
          adjustments: []
      };
      setProjects(prev => [...prev, p]);
      setShowAddProject(false);
      setNewProject({ name: '', code: '', type: ProjectType.NSTC, budget: 0, categoryBudgets: {} });
  };

  const updateCategoryBudget = (catId: string, amount: number) => {
      setNewProject(prev => ({
          ...prev,
          categoryBudgets: { ...prev.categoryBudgets, [catId]: amount }
      }));
  };
  
  const handleAddAdjustment = () => {
      if (!adjustingProject || adjustmentAmount === 0 || !adjustmentReason) {
          alert("請輸入調節金額與備註");
          return;
      }
      
      setProjects(prev => prev.map(p => {
          if (p.id !== adjustingProject) return p;
          
          const newAdjustment = {
              id: Date.now().toString(),
              date: new Date().toISOString().split('T')[0],
              amount: adjustmentAmount,
              reason: adjustmentReason,
              user: 'Admin'
          };
          
          const newAdjustments = [...(p.adjustments || []), newAdjustment];
          // Recalculate immediately for this project
          const manualSpent = newAdjustments.reduce((sum, a) => sum + a.amount, 0);
          // Note: p.spent includes expenseSpent + manualSpent. 
          // We need to re-derive from current state logic, but here we can just update the list 
          // and let the useEffect/recalculateBudgets handle the math correctly on next render or force it.
          // To be safe, we just update the adjustments list here, and call recalculateBudgets.
          return { ...p, adjustments: newAdjustments };
      }));
      
      // Trigger global recalc to update UI numbers properly
      // We need to wait for state update, but since recalculateBudgets depends on 'expenses', 
      // let's manually trigger a recalc with current expenses after a small timeout or just update logic.
      // Actually, updating 'projects' state directly triggers re-render, but we need to ensure the math is right.
      // The easiest way is to apply the math right here.
      
      setAdjustingProject(null);
      setAdjustmentAmount(0);
      setAdjustmentReason('');
  };
  
  // Effect to recalculate when adjustments change (implied by projects change, but we need to ensure math is consistent)
  // We already have logic in recalculateBudgets. We just need to make sure it runs.
  // We can just call it with current expenses.
  useEffect(() => {
      if (adjustingProject === null) {
          recalculateBudgets(expenses);
      }
  }, [adjustingProject]); // When closing the modal, ensure sync.


  // Dashboard Metrics
  const totalBudget = projects.reduce((acc, p) => acc + p.budget, 0);
  const totalSpent = projects.reduce((acc, p) => acc + p.spent, 0);
  const totalPending = projects.reduce((acc, p) => acc + p.pending, 0);
  const totalRemaining = totalBudget - totalSpent - totalPending;

  const renderContent = () => {
    switch (view) {
      case 'form':
        return <ExpenseForm projects={projects} existingEmployees={employees} onSave={handleSaveExpense} onCancel={() => setView('home')} />;
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
                   <div className="text-gray-500 text-sm font-bold uppercase tracking-widest mb-2">已實支 (含調節)</div>
                   <div className="text-3xl font-bold text-gray-900">${totalSpent.toLocaleString()}</div>
                </Card>
                <Card className="p-6 flex flex-col justify-center items-center text-center">
                    <div className="text-sm text-gray-500 mb-1">整體執行率</div>
                    <div className="text-3xl font-bold text-black">{totalBudget > 0 ? Math.round(((totalSpent + totalPending) / totalBudget) * 100) : 0}%</div>
                </Card>
             </div>

             {/* Projects & Usage */}
             <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                 <div className="lg:col-span-2">
                    <Card className="p-8 h-full">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold flex items-center gap-2">
                                <LayoutDashboard size={24}/> 各計畫預算執行率
                            </h3>
                            <Button size="sm" onClick={() => setShowAddProject(!showAddProject)}>
                                <Plus size={16}/> 新增計畫
                            </Button>
                        </div>
                        
                        {/* Add Project Panel */}
                        {showAddProject && (
                            <div className="mb-6 p-6 bg-gray-100 rounded-lg border border-gray-300 animate-fade-in">
                                <h4 className="font-bold text-lg mb-4 flex items-center gap-2"><FolderPlus size={20}/> 新增計畫設定</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                    <input placeholder="計畫代號 (e.g. 113-2221...)" className="p-2 bg-gray-900 text-white rounded" 
                                        value={newProject.code} onChange={e => setNewProject({...newProject, code: e.target.value})} />
                                    <input placeholder="計畫名稱" className="p-2 bg-gray-900 text-white rounded" 
                                        value={newProject.name} onChange={e => setNewProject({...newProject, name: e.target.value})} />
                                    <select className="p-2 bg-gray-900 text-white rounded" 
                                        value={newProject.type} onChange={e => setNewProject({...newProject, type: e.target.value as ProjectType})}>
                                        {Object.values(ProjectType).map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                    <input type="number" placeholder="總預算金額" className="p-2 bg-gray-900 text-white rounded" 
                                        value={newProject.budget || ''} onChange={e => setNewProject({...newProject, budget: parseInt(e.target.value) || 0})} />
                                </div>
                                <div className="mb-4">
                                    <p className="font-bold text-sm mb-2 text-gray-700">各類別預算上限 (選填，0為不限)</p>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                        {CATEGORIES.map(cat => (
                                            <div key={cat.id} className="flex flex-col">
                                                <span className="text-xs text-gray-500">{cat.name}</span>
                                                <input type="number" placeholder="0" className="p-1 text-sm bg-gray-800 text-white rounded border border-gray-600"
                                                    onChange={e => updateCategoryBudget(cat.id, parseInt(e.target.value) || 0)} />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="flex gap-2 justify-end">
                                    <Button size="sm" variant="outline" onClick={() => setShowAddProject(false)}>取消</Button>
                                    <Button size="sm" onClick={handleAddProject}>確認新增</Button>
                                </div>
                            </div>
                        )}

                        {/* Adjust Project Modal/Panel */}
                        {adjustingProject && (
                            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                                <Card className="w-full max-w-lg p-6 bg-white relative">
                                    <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                                        <Settings size={20}/> 經費調節 (手動修正)
                                    </h3>
                                    <p className="text-sm text-gray-500 mb-4">
                                        此功能用於輸入「系統外」的收支，例如系統上線前已核銷的經費，或預算增減。
                                        正數代表增加支出(減少餘額)，負數代表退款(增加餘額)。
                                    </p>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-bold mb-1">調節金額 (NTD)</label>
                                            <input 
                                                type="number" 
                                                className="w-full p-2 bg-gray-900 text-white rounded"
                                                placeholder="輸入金額 (正數=支出)"
                                                value={adjustmentAmount} 
                                                onChange={e => setAdjustmentAmount(parseInt(e.target.value) || 0)} 
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold mb-1">備註 / 原因</label>
                                            <input 
                                                type="text" 
                                                className="w-full p-2 bg-gray-900 text-white rounded"
                                                placeholder="例如: 1-3月紙本核銷總額"
                                                value={adjustmentReason} 
                                                onChange={e => setAdjustmentReason(e.target.value)} 
                                            />
                                        </div>
                                        
                                        {/* History */}
                                        <div className="bg-gray-100 p-3 rounded h-32 overflow-y-auto">
                                            <h5 className="text-xs font-bold text-gray-500 mb-2">歷史調節紀錄</h5>
                                            {projects.find(p => p.id === adjustingProject)?.adjustments?.map(adj => (
                                                <div key={adj.id} className="flex justify-between text-xs border-b border-gray-200 py-1">
                                                    <span>{adj.date} - {adj.reason}</span>
                                                    <span className="font-bold">${adj.amount.toLocaleString()}</span>
                                                </div>
                                            ))}
                                            {(projects.find(p => p.id === adjustingProject)?.adjustments?.length || 0) === 0 && <p className="text-xs text-gray-400">尚無紀錄</p>}
                                        </div>

                                        <div className="flex justify-end gap-2 mt-4">
                                            <Button variant="outline" onClick={() => setAdjustingProject(null)}>關閉</Button>
                                            <Button onClick={handleAddAdjustment}>確認調節</Button>
                                        </div>
                                    </div>
                                </Card>
                            </div>
                        )}

                        <div className="space-y-6 max-h-[400px] overflow-y-auto pr-2">
                            {projects.filter(p => p.id !== 'undecided').map(p => {
                                const used = p.spent + p.pending;
                                const percent = p.budget > 0 ? Math.min(100, Math.round((used / p.budget) * 100)) : 0;
                                return (
                                <div key={p.id} className="group">
                                    <div className="flex justify-between mb-1 items-end">
                                        <div className="flex flex-col">
                                            <span className="font-bold text-gray-800">{p.name}</span>
                                            <span className="text-xs text-gray-500">{p.code}</span>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <button 
                                                onClick={() => setAdjustingProject(p.id)}
                                                className="opacity-0 group-hover:opacity-100 transition-opacity text-xs bg-gray-200 hover:bg-black hover:text-white px-2 py-1 rounded flex items-center gap-1"
                                            >
                                                <Settings size={12}/> 調節
                                            </button>
                                            <div className="text-right">
                                                <span className="text-gray-900 font-bold block">{percent}%</span>
                                                <span className="text-gray-500 text-xs">${used.toLocaleString()} / ${p.budget.toLocaleString()}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                                        <div 
                                            className={`h-3 rounded-full transition-all duration-500 ${percent > 90 ? 'bg-red-600' : 'bg-black'}`} 
                                            style={{ width: `${percent}%` }}
                                        ></div>
                                    </div>
                                </div>
                                );
                            })}
                        </div>
                    </Card>
                 </div>
                 
                 <div className="lg:col-span-1">
                     <Card className="p-6 h-full bg-gray-900 text-white flex flex-col justify-between">
                        <div>
                            <h3 className="font-bold text-xl mb-4 text-orange-500">注意事項</h3>
                            <ul className="space-y-4 text-sm text-gray-300 list-disc pl-4">
                                <li>「未決定計畫」的款項請盡快指派歸屬。</li>
                                <li>預算執行率超過 90% 會顯示紅色警示。</li>
                                <li>若需補登系統上線前的支出，請使用「調節」功能。</li>
                                <li>點擊列表中的「編輯」可修正輸入錯誤或重新分派計畫。</li>
                            </ul>
                        </div>
                        <div className="mt-8 pt-6 border-t border-gray-700">
                             <div className="text-xs text-gray-500 mb-1">System Status</div>
                             <div className="flex items-center gap-2">
                                 <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                 <span className="font-mono">Online / v1.3.0</span>
                             </div>
                        </div>
                     </Card>
                 </div>
             </div>

             <ExpenseList 
                expenses={expenses} 
                projects={projects}
                onUpdateStatus={handleUpdateStatus}
                onAddNote={handleAddNote}
                onUpdateExpense={handleUpdateExpense}
                onLogout={() => { setIsAdminLoggedIn(false); setView('home'); }}
                allowEdit={true}
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
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans p-4 md:p-8">
      {renderContent()}
    </div>
  );
};

export default App;