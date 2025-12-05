
import React, { useState } from 'react';
import { Expense, Project, ExpenseStatus, PaymentMethod, InvoiceItem } from '../types';
import { CATEGORIES } from '../constants';
import { Button } from './ui/Button';
import { Download, Search, Filter, ChevronDown, ChevronUp, Edit, Check, X, CheckSquare, XSquare, FileSpreadsheet, Save } from 'lucide-react';

interface ExpenseListProps {
  expenses: Expense[];
  projects: Project[];
  onUpdateStatus: (id: string, status: ExpenseStatus) => void;
  onAddNote: (id: string, note: string) => void;
  onUpdateExpense: (expense: Expense) => void;
  onLogout: () => void;
  allowEdit?: boolean;
}

export const ExpenseList: React.FC<ExpenseListProps> = ({ 
  expenses, 
  projects, 
  onUpdateStatus, 
  onAddNote,
  onUpdateExpense,
  onLogout,
  allowEdit = false
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterProject, setFilterProject] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Expense | null>(null);

  // --- Filtering Logic ---
  const filteredExpenses = expenses.filter(ex => {
    const project = projects.find(p => p.id === ex.projectId);
    const categoryName = CATEGORIES.find(c => c.id === ex.category)?.name || '';
    
    // Text Search
    const searchString = `${ex.invoiceNumber || ''} ${project?.name} ${ex.payerName || ''} ${ex.items[0]?.name} ${categoryName}`.toLowerCase();
    const matchesSearch = searchString.includes(searchTerm.toLowerCase());
    
    // Dropdown Filters
    const matchProject = filterProject === 'all' || ex.projectId === filterProject;
    const matchStatus = filterStatus === 'all' || ex.status === filterStatus;

    return matchesSearch && matchProject && matchStatus;
  }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // --- Edit Handlers ---
  const startEdit = (expense: Expense) => {
    setEditingId(expense.id);
    setEditData({ ...expense });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditData(null);
  };

  const saveEdit = () => {
    if (editData) {
       // Recalculate total amount
       const newTotal = editData.items.reduce((sum, i) => sum + (i.unitPrice * i.quantity), 0);
       onUpdateExpense({
           ...editData,
           items: editData.items.map(i => ({...i, amount: i.unitPrice * i.quantity})),
           totalAmount: newTotal
       });
    }
    setEditingId(null);
    setEditData(null);
  };

  const updateEditField = (field: keyof Expense, value: any) => {
    if (!editData) return;
    setEditData({ ...editData, [field]: value });
  };

  const updateEditItem = (itemId: string, field: keyof InvoiceItem, value: any) => {
    if (!editData) return;
    const newItems = editData.items.map(i => i.id === itemId ? { ...i, [field]: value } : i);
    setEditData({ ...editData, items: newItems });
  };

  // --- Helpers ---
  const getStatusStyle = (status: ExpenseStatus) => {
    switch (status) {
      case ExpenseStatus.SUBMITTED: return "bg-gray-200 text-gray-800";
      case ExpenseStatus.COMPANY_APPROVED: return "bg-orange-100 text-orange-800 border border-orange-200";
      case ExpenseStatus.NCKU_LOGGED: return "bg-blue-100 text-blue-800 border border-blue-200";
      case ExpenseStatus.NCKU_APPROVED: return "bg-gray-800 text-white"; 
      case ExpenseStatus.NCKU_PAID: return "bg-black text-white ring-2 ring-gray-300";
      case ExpenseStatus.REJECTED: return "bg-red-100 text-red-800 border border-red-200";
      default: return "bg-gray-100 text-gray-500";
    }
  };

  const exportToCSV = () => {
    const headers = ["日期", "發票號碼", "計畫", "項目", "金額", "付款方式", "狀態"];
    const rows = filteredExpenses.map(ex => {
       const pName = projects.find(p => p.id === ex.projectId)?.name || '未知';
       const itemName = ex.items.map(i => i.name).join('; ');
       const payment = ex.paymentMethod === PaymentMethod.ADVANCE ? `代墊-${ex.payerName}` : `廠商-${ex.vendorTaxId}`;
       return [ex.date, ex.invoiceNumber || '-', pName, itemName, ex.totalAmount, payment, ex.status];
    });

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
      + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `expenses_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const inputStyle = "w-full p-2 bg-gray-900 text-white border border-gray-600 rounded focus:border-orange-500 focus:outline-none";

  return (
    <div className="space-y-6 pb-20">
       {/* Header Toolbar */}
       <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">核銷明細管理</h2>
            <p className="text-gray-500 text-sm mt-1">共有 {filteredExpenses.length} 筆資料</p>
          </div>
          <div className="flex gap-2">
             <Button variant="outline" size="sm" onClick={exportToCSV}>
               <FileSpreadsheet size={18} /> 匯出 Excel (CSV)
             </Button>
             <Button variant="ghost" size="sm" onClick={onLogout} className="text-gray-500 hover:text-red-600">
               登出
             </Button>
          </div>
       </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm grid grid-cols-1 md:grid-cols-12 gap-4">
         <div className="md:col-span-4 relative">
            <Search className="absolute left-3 top-3 text-white" size={20}/>
            <input 
              type="text" 
              placeholder="搜尋編號、品名、人名..." 
              className="w-full pl-10 p-2.5 bg-gray-900 text-white border border-gray-700 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 placeholder-gray-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
         </div>
         <div className="md:col-span-3">
            <select 
               className="w-full p-2.5 bg-gray-900 text-white border border-gray-700 rounded-lg"
               value={filterProject}
               onChange={(e) => setFilterProject(e.target.value)}
            >
               <option value="all">所有計畫</option>
               {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
         </div>
         <div className="md:col-span-3">
             <select 
               className="w-full p-2.5 bg-gray-900 text-white border border-gray-700 rounded-lg"
               value={filterStatus}
               onChange={(e) => setFilterStatus(e.target.value)}
            >
               <option value="all">所有狀態</option>
               {Object.values(ExpenseStatus).map(s => <option key={s} value={s}>{s}</option>)}
            </select>
         </div>
         <div className="md:col-span-2 text-right flex items-center justify-end">
            <span className="text-gray-500 text-sm mr-2">總計</span>
            <span className="text-xl font-bold text-gray-900">${filteredExpenses.reduce((s,i)=>s+i.totalAmount,0).toLocaleString()}</span>
         </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-900 text-white">
                <th className="p-4 font-semibold text-sm uppercase tracking-wider">日期 / 單號</th>
                <th className="p-4 font-semibold text-sm uppercase tracking-wider">計畫與項目</th>
                <th className="p-4 font-semibold text-sm uppercase tracking-wider text-right">金額</th>
                <th className="p-4 font-semibold text-sm uppercase tracking-wider">付款方式</th>
                <th className="p-4 font-semibold text-sm uppercase tracking-wider">狀態</th>
                <th className="p-4 font-semibold text-sm uppercase tracking-wider text-center">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredExpenses.length === 0 ? (
                <tr>
                   <td colSpan={6} className="p-8 text-center text-gray-500">
                      查無資料
                   </td>
                </tr>
              ) : (
                filteredExpenses.map(item => {
                  const project = projects.find(p => p.id === item.projectId);
                  const isExpanded = expandedRowId === item.id;
                  
                  return (
                    <React.Fragment key={item.id}>
                      <tr 
                        className={`hover:bg-orange-50 transition-colors ${isExpanded ? 'bg-orange-50' : 'even:bg-gray-50'}`}
                        onClick={() => !editingId && setExpandedRowId(isExpanded ? null : item.id)}
                      >
                        <td className="p-4 align-top cursor-pointer">
                           <div className="font-bold text-gray-900">{item.date}</div>
                           <div className="text-xs text-gray-500 font-mono mt-1">{item.invoiceNumber || '-'}</div>
                        </td>
                        <td className="p-4 align-top cursor-pointer">
                           <div className="text-sm font-bold text-gray-800 line-clamp-1">{project?.name}</div>
                           <div className="text-gray-600 mt-1">
                              {item.items[0].name} 
                              {item.items.length > 1 && <span className="text-gray-400 text-xs ml-1">(+{item.items.length-1})</span>}
                           </div>
                           {item.requiresPurchaseRequest && <span className="text-xs bg-red-100 text-red-600 px-1 rounded mt-1 inline-block">需請購單</span>}
                        </td>
                        <td className="p-4 align-top text-right font-bold text-gray-900 cursor-pointer">
                           ${item.totalAmount.toLocaleString()}
                        </td>
                        <td className="p-4 align-top cursor-pointer">
                           {item.paymentMethod === PaymentMethod.ADVANCE ? (
                             <div>
                               <span className="text-xs font-bold border border-gray-400 rounded px-1 text-gray-600">代墊</span>
                               <div className="text-sm mt-1">{item.payerName}</div>
                             </div>
                           ) : (
                             <div>
                               <span className="text-xs font-bold bg-black text-white rounded px-1">廠商</span>
                               <div className="text-sm font-mono mt-1">{item.vendorTaxId}</div>
                             </div>
                           )}
                        </td>
                        <td className="p-4 align-top cursor-pointer">
                           <span className={`px-3 py-1 rounded-full text-xs font-bold inline-block ${getStatusStyle(item.status)}`}>
                             {item.status}
                           </span>
                        </td>
                        <td className="p-4 align-top text-center">
                           <button 
                             onClick={(e) => { e.stopPropagation(); setExpandedRowId(isExpanded ? null : item.id); }}
                             className="p-2 hover:bg-gray-200 rounded-full text-gray-600"
                           >
                              {isExpanded ? <ChevronUp size={20}/> : <ChevronDown size={20}/>}
                           </button>
                        </td>
                      </tr>
                      
                      {/* Expanded Detail View */}
                      {isExpanded && (
                        <tr className="bg-orange-50/50">
                          <td colSpan={6} className="p-0">
                             <div className="p-6 border-t border-gray-200 shadow-inner">
                                {editingId === item.id && editData ? (
                                    // --- EDIT MODE ---
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center mb-4">
                                            <h3 className="text-xl font-bold">編輯單據</h3>
                                            <div className="flex gap-2">
                                                <Button size="sm" variant="primary" onClick={saveEdit}><Save size={16}/> 儲存變更</Button>
                                                <Button size="sm" variant="outline" onClick={cancelEdit}><X size={16}/> 取消</Button>
                                            </div>
                                        </div>
                                        
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-bold mb-1">歸屬計畫 (重新指派)</label>
                                                <select className={inputStyle} value={editData.projectId} onChange={e => updateEditField('projectId', e.target.value)}>
                                                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                                </select>
                                            </div>
                                            <div>
                                                 <label className="block text-sm font-bold mb-1">發票號碼</label>
                                                 <input type="text" className={inputStyle} value={editData.invoiceNumber || ''} onChange={e => updateEditField('invoiceNumber', e.target.value)}/>
                                            </div>
                                             <div>
                                                 <label className="block text-sm font-bold mb-1">日期</label>
                                                 <input type="date" className={inputStyle} value={editData.date} onChange={e => updateEditField('date', e.target.value)}/>
                                            </div>
                                        </div>

                                        <div className="bg-white rounded border border-gray-300 p-2">
                                            <table className="w-full text-sm">
                                                <thead className="bg-gray-100">
                                                    <tr>
                                                        <th className="p-2">品名</th>
                                                        <th className="p-2 w-24">單價</th>
                                                        <th className="p-2 w-16">數量</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {editData.items.map(sub => (
                                                        <tr key={sub.id}>
                                                            <td className="p-1"><input type="text" className={inputStyle} value={sub.name} onChange={e => updateEditItem(sub.id, 'name', e.target.value)} /></td>
                                                            <td className="p-1"><input type="number" className={inputStyle} value={sub.unitPrice} onChange={e => updateEditItem(sub.id, 'unitPrice', parseInt(e.target.value))} /></td>
                                                            <td className="p-1"><input type="number" className={inputStyle} value={sub.quantity} onChange={e => updateEditItem(sub.id, 'quantity', parseInt(e.target.value))} /></td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                ) : (
                                    // --- VIEW MODE ---
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    {/* Left: Detailed Items */}
                                    <div className="bg-white rounded border border-gray-200 overflow-hidden relative">
                                        <div className="flex justify-between items-center bg-gray-100 px-3 py-2 border-b border-gray-200">
                                            <span className="font-bold text-sm text-gray-700">明細內容</span>
                                            {allowEdit && (
                                                <button onClick={() => startEdit(item)} className="text-xs flex items-center gap-1 text-gray-600 hover:text-black">
                                                    <Edit size={12}/> 編輯/重新指派
                                                </button>
                                            )}
                                        </div>
                                        <table className="w-full text-sm">
                                            <thead className="bg-gray-50 border-b border-gray-100">
                                                <tr>
                                                <th className="p-2 text-left">品名</th>
                                                <th className="p-2 text-right">單價</th>
                                                <th className="p-2 text-right">數量</th>
                                                <th className="p-2 text-right">小計</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {item.items.map((sub, idx) => (
                                                <tr key={idx} className="border-b border-gray-100">
                                                    <td className="p-2">{sub.name}</td>
                                                    <td className="p-2 text-right text-gray-500">${sub.unitPrice.toLocaleString()}</td>
                                                    <td className="p-2 text-right text-gray-500">{sub.quantity}</td>
                                                    <td className="p-2 text-right font-bold">${sub.amount.toLocaleString()}</td>
                                                </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                        {item.notes.length > 0 && (
                                            <div className="p-3 bg-yellow-50 text-xs text-gray-700 border-t border-gray-200">
                                                <strong>備註紀錄:</strong>
                                                <ul className="list-disc pl-4 mt-1 space-y-1">
                                                {item.notes.map((n, i) => <li key={i}>{n}</li>)}
                                                </ul>
                                            </div>
                                        )}
                                    </div>

                                    {/* Right: Actions */}
                                    <div className="space-y-4">
                                        <h4 className="font-bold text-gray-900 border-b border-gray-300 pb-2">審核操作</h4>
                                        <div className="flex flex-col gap-2">
                                            {item.status === ExpenseStatus.SUBMITTED && (
                                            <div className="flex gap-2">
                                                <Button size="sm" fullWidth onClick={() => onUpdateStatus(item.id, ExpenseStatus.COMPANY_APPROVED)}>
                                                    <CheckSquare size={16}/> 公司核准
                                                </Button>
                                                <Button size="sm" variant="danger" fullWidth onClick={() => onUpdateStatus(item.id, ExpenseStatus.REJECTED)}>
                                                    <XSquare size={16}/> 退回
                                                </Button>
                                            </div>
                                            )}

                                            {item.status === ExpenseStatus.COMPANY_APPROVED && (
                                                <Button size="sm" variant="secondary" fullWidth onClick={() => onUpdateStatus(item.id, ExpenseStatus.NCKU_LOGGED)}>
                                                已送件至學校系統
                                                </Button>
                                            )}

                                            {item.status === ExpenseStatus.NCKU_LOGGED && (
                                                <Button size="sm" className="bg-emerald-700 text-white hover:bg-emerald-800" fullWidth onClick={() => onUpdateStatus(item.id, ExpenseStatus.NCKU_APPROVED)}>
                                                成大已核准 (扣款)
                                                </Button>
                                            )}

                                            {item.status === ExpenseStatus.NCKU_APPROVED && (
                                                <Button size="sm" variant="outline" fullWidth onClick={() => onUpdateStatus(item.id, ExpenseStatus.NCKU_PAID)}>
                                                確認撥款完成
                                                </Button>
                                            )}
                                            
                                            {item.status === ExpenseStatus.REJECTED && (
                                                <Button size="sm" variant="outline" onClick={() => onUpdateStatus(item.id, ExpenseStatus.SUBMITTED)}>重設為待審核</Button>
                                            )}
                                        </div>
                                        
                                        <div className="pt-4 border-t border-gray-200">
                                            <input 
                                            type="text" 
                                            placeholder="新增備註..." 
                                            className="w-full text-sm p-2 bg-gray-900 text-white border border-gray-600 rounded mb-2 placeholder-gray-500"
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                onAddNote(item.id, e.currentTarget.value);
                                                e.currentTarget.value = '';
                                                }
                                            }}
                                            />
                                            <p className="text-xs text-gray-400">按 Enter 儲存備註</p>
                                        </div>
                                    </div>
                                    </div>
                                )}
                             </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
