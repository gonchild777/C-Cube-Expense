
import React, { useState } from 'react';
import { Expense, Project, ExpenseStatus, PaymentMethod } from '../types';
import { CATEGORIES } from '../constants';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Download, Search, Filter, ChevronDown, ChevronUp, MoreHorizontal, Edit, Trash, CheckSquare, XSquare, FileSpreadsheet } from 'lucide-react';

interface ExpenseListProps {
  expenses: Expense[];
  projects: Project[];
  onUpdateStatus: (id: string, status: ExpenseStatus) => void;
  onAddNote: (id: string, note: string) => void;
  onLogout: () => void;
}

export const ExpenseList: React.FC<ExpenseListProps> = ({ 
  expenses, 
  projects, 
  onUpdateStatus, 
  onAddNote,
  onLogout
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterProject, setFilterProject] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);

  // --- Filtering Logic ---
  const filteredExpenses = expenses.filter(ex => {
    const project = projects.find(p => p.id === ex.projectId);
    const categoryName = CATEGORIES.find(c => c.id === ex.category)?.name || '';
    
    // Text Search
    const searchString = `${ex.invoiceNumber} ${project?.name} ${ex.payerName} ${ex.items[0]?.name} ${categoryName}`.toLowerCase();
    const matchesSearch = searchString.includes(searchTerm.toLowerCase());
    
    // Dropdown Filters
    const matchProject = filterProject === 'all' || ex.projectId === filterProject;
    const matchStatus = filterStatus === 'all' || ex.status === filterStatus;

    return matchesSearch && matchProject && matchStatus;
  }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // --- Helpers ---
  const getStatusStyle = (status: ExpenseStatus) => {
    switch (status) {
      case ExpenseStatus.SUBMITTED: return "bg-gray-200 text-gray-800";
      case ExpenseStatus.COMPANY_APPROVED: return "bg-orange-100 text-orange-800 border border-orange-200";
      case ExpenseStatus.NCKU_LOGGED: return "bg-blue-100 text-blue-800 border border-blue-200";
      case ExpenseStatus.NCKU_APPROVED: return "bg-gray-800 text-white"; // High contrast for important state
      case ExpenseStatus.NCKU_PAID: return "bg-black text-white ring-2 ring-gray-300"; // Final state
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
       return [ex.date, ex.invoiceNumber, pName, itemName, ex.totalAmount, payment, ex.status];
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
            <Search className="absolute left-3 top-3 text-gray-400" size={20}/>
            <input 
              type="text" 
              placeholder="搜尋編號、品名、人名..." 
              className="w-full pl-10 p-2.5 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-black focus:border-black"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
         </div>
         <div className="md:col-span-3">
            <select 
               className="w-full p-2.5 border border-gray-300 rounded-lg text-gray-900 bg-white"
               value={filterProject}
               onChange={(e) => setFilterProject(e.target.value)}
            >
               <option value="all">所有計畫</option>
               {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
         </div>
         <div className="md:col-span-3">
             <select 
               className="w-full p-2.5 border border-gray-300 rounded-lg text-gray-900 bg-white"
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
                        onClick={() => setExpandedRowId(isExpanded ? null : item.id)}
                      >
                        <td className="p-4 align-top cursor-pointer">
                           <div className="font-bold text-gray-900">{item.date}</div>
                           <div className="text-xs text-gray-500 font-mono mt-1">{item.invoiceNumber}</div>
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
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                   {/* Left: Detailed Items */}
                                   <div className="bg-white rounded border border-gray-200 overflow-hidden">
                                      <table className="w-full text-sm">
                                         <thead className="bg-gray-100 border-b border-gray-200">
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
                                           className="w-full text-sm p-2 border border-gray-300 rounded mb-2"
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
