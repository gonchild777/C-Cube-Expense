
import React, { useState, useEffect } from 'react';
import { Project, Category, ExpenseStatus, Expense, ProjectType, InvoiceItem, PaymentMethod } from '../types';
import { CATEGORIES, PURCHASE_REQUEST_THRESHOLD, EMPLOYEES } from '../constants';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { analyzeExpense } from '../services/geminiService';
import { AlertCircle, Info, Loader2, Plus, Trash2, User, Building2, CheckCircle2 } from 'lucide-react';

interface ExpenseFormProps {
  projects: Project[];
  onSave: (expense: Omit<Expense, 'id'>) => void;
  onCancel: () => void;
}

export const ExpenseForm: React.FC<ExpenseFormProps> = ({ projects, onSave, onCancel }) => {
  // --- State ---
  const [projectId, setProjectId] = useState<string>('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [invoiceNumber, setInvoiceNumber] = useState<string>('');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  
  const [items, setItems] = useState<InvoiceItem[]>([
    { id: '1', name: '', unitPrice: 0, quantity: 1, amount: 0 }
  ]);

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.ADVANCE);
  const [payerName, setPayerName] = useState<string>(EMPLOYEES[0]);
  const [vendorTaxId, setVendorTaxId] = useState<string>('');

  const [aiAnalysis, setAiAnalysis] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // --- Derived State ---
  const selectedProject = projects.find(p => p.id === projectId);
  const totalAmount = items.reduce((sum, item) => sum + item.amount, 0);
  const isOverThreshold = totalAmount > PURCHASE_REQUEST_THRESHOLD;
  const isCategoryAllowed = selectedProject 
    ? selectedProject.allowedCategories.includes(categoryId) 
    : true;

  // --- Handlers ---
  const handleItemChange = (id: string, field: keyof InvoiceItem, value: any) => {
    setItems(prev => prev.map(item => {
      if (item.id !== id) return item;
      const updatedItem = { ...item, [field]: value };
      if (field === 'unitPrice' || field === 'quantity') {
        updatedItem.amount = updatedItem.unitPrice * updatedItem.quantity;
      }
      return updatedItem;
    }));
  };

  const addItem = () => {
    const newId = Date.now().toString();
    setItems(prev => [...prev, { id: newId, name: '', unitPrice: 0, quantity: 1, amount: 0 }]);
  };

  const removeItem = (id: string) => {
    if (items.length > 1) {
      setItems(prev => prev.filter(i => i.id !== id));
    }
  };

  useEffect(() => {
    if (selectedProject && categoryId === 'meal' && selectedProject.type === ProjectType.NSTC) {
      setAiAnalysis('⚠️ 國科會計畫通常不允許編列誤餐費，請再次確認核定清單。');
    } else {
      setAiAnalysis('');
    }
  }, [projectId, categoryId, selectedProject]);

  const handleAICheck = async () => {
    if (!selectedProject || items.length === 0 || totalAmount === 0) return;
    setIsAnalyzing(true);
    const categoryName = CATEGORIES.find(c => c.id === categoryId)?.name || '未知';
    const result = await analyzeExpense(items, totalAmount, selectedProject, categoryName);
    setAiAnalysis(result);
    setIsAnalyzing(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId || !categoryId || !invoiceNumber) {
      alert("請填寫完整必填欄位");
      return;
    }
    if (totalAmount <= 0) {
      alert("金額不能為 0");
      return;
    }

    onSave({
      projectId,
      category: categoryId,
      date,
      invoiceNumber,
      paymentMethod,
      payerName: paymentMethod === PaymentMethod.ADVANCE ? payerName : undefined,
      vendorTaxId: paymentMethod === PaymentMethod.DIRECT ? vendorTaxId : undefined,
      items,
      totalAmount,
      status: ExpenseStatus.SUBMITTED,
      notes: isOverThreshold ? ['系統自動備註: 金額超過一萬五，請檢附請購單'] : [],
      requiresPurchaseRequest: isOverThreshold
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      <div className="flex items-center gap-3 border-b-2 border-black pb-4">
        <div className="bg-black text-white w-10 h-10 rounded flex items-center justify-center font-bold text-xl">1</div>
        <h2 className="text-3xl font-bold text-gray-900">
           新增核銷單據
        </h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        
        {/* Section 1: Project & Category */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="p-6">
              <label className="block text-xl font-bold text-gray-900 mb-3">
                歸屬計畫 <span className="text-orange-600">*</span>
              </label>
              <select
                required
                className="w-full text-lg p-4 border-2 border-gray-300 rounded-lg bg-white focus:border-black focus:ring-0 text-gray-900"
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
              >
                <option value="" className="text-gray-500">-- 請下拉選擇 --</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id} className="text-gray-900 font-medium">
                    {p.code} - {p.name}
                  </option>
                ))}
              </select>
              {selectedProject && (
                <div className="mt-2 text-sm text-gray-500 bg-gray-100 p-2 rounded">
                   可用餘額: <span className="font-bold text-gray-900">${selectedProject.remaining.toLocaleString()}</span>
                </div>
              )}
            </Card>

            <Card className="p-6">
                <label className="block text-xl font-bold text-gray-900 mb-3">
                  支出類別 <span className="text-orange-600">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {CATEGORIES.map(cat => {
                    const allowed = selectedProject ? selectedProject.allowedCategories.includes(cat.id) : true;
                    const isSelected = categoryId === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => allowed && setCategoryId(cat.id)}
                        disabled={!allowed}
                        className={`
                          p-3 rounded border-2 text-left flex items-center gap-2 transition-all
                          ${isSelected 
                            ? 'border-orange-500 bg-orange-50 text-gray-900' 
                            : 'border-gray-200 text-gray-600 hover:border-gray-400'
                          }
                          ${!allowed ? 'opacity-30 cursor-not-allowed' : ''}
                        `}
                      >
                        <span className="text-xl">{cat.icon}</span>
                        <span className={`font-bold ${isSelected ? 'text-orange-700' : ''}`}>{cat.name}</span>
                      </button>
                    );
                  })}
                </div>
            </Card>
        </div>

        {/* Section 2: Invoice Details */}
        <Card className="p-6">
           <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
             <span className="bg-black text-white w-6 h-6 rounded text-sm flex items-center justify-center">2</span>
             發票資訊
           </h3>
           
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
             <div>
                <label className="block text-gray-700 font-bold mb-2">發票號碼</label>
                <input
                  type="text"
                  required
                  placeholder="AB-12345678"
                  className="w-full text-xl p-3 border-2 border-gray-300 rounded-lg uppercase focus:border-black focus:ring-0 text-gray-900 placeholder-gray-400"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                />
             </div>
             <div>
                <label className="block text-gray-700 font-bold mb-2">發票日期</label>
                <input
                  type="date"
                  required
                  className="w-full text-xl p-3 border-2 border-gray-300 rounded-lg focus:border-black focus:ring-0 text-gray-900"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
             </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <div className="mb-4 flex justify-between items-end">
              <label className="text-lg font-bold text-gray-900">消費明細列表</label>
            </div>
            
            <div className="space-y-4">
              {items.map((item, index) => (
                <div key={item.id} className="flex flex-col md:flex-row gap-3 items-start md:items-center bg-white p-3 rounded shadow-sm border border-gray-200">
                    <span className="bg-gray-200 text-gray-600 w-8 h-8 rounded flex items-center justify-center font-bold flex-shrink-0">
                      {index + 1}
                    </span>
                    
                    <div className="flex-1 w-full">
                      <input
                        type="text"
                        required
                        placeholder="品名 (例如: A4紙)"
                        className="w-full p-2 border border-gray-300 rounded text-gray-900 font-medium focus:border-black focus:ring-0"
                        value={item.name}
                        onChange={(e) => handleItemChange(item.id, 'name', e.target.value)}
                        onBlur={handleAICheck}
                      />
                    </div>
                    
                    <div className="flex gap-2 w-full md:w-auto">
                      <div className="flex-1">
                         <div className="relative">
                           <span className="absolute left-2 top-2 text-gray-400">$</span>
                           <input
                              type="number"
                              min="0"
                              placeholder="單價"
                              className="w-24 p-2 pl-5 border border-gray-300 rounded text-right focus:border-black focus:ring-0"
                              value={item.unitPrice || ''}
                              onChange={(e) => handleItemChange(item.id, 'unitPrice', parseInt(e.target.value) || 0)}
                           />
                         </div>
                      </div>
                      <span className="text-gray-400 self-center">x</span>
                      <div className="flex-1">
                         <input
                            type="number"
                            min="1"
                            placeholder="數量"
                            className="w-16 p-2 border border-gray-300 rounded text-center focus:border-black focus:ring-0"
                            value={item.quantity}
                            onChange={(e) => handleItemChange(item.id, 'quantity', parseInt(e.target.value) || 1)}
                         />
                      </div>
                    </div>

                    <div className="text-right min-w-[80px] font-bold text-xl text-gray-900">
                       ${item.amount.toLocaleString()}
                    </div>

                    {items.length > 1 && (
                      <button 
                        type="button"
                        onClick={() => removeItem(item.id)}
                        className="text-gray-400 hover:text-red-500 p-2 transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={addItem}
              className="mt-4 w-full py-3 border-2 border-dashed border-gray-300 text-gray-500 rounded-lg hover:border-orange-500 hover:text-orange-600 transition-colors font-medium flex items-center justify-center gap-2 bg-white"
            >
              <Plus size={20} /> 增加一列品項
            </button>
            
            <div className="mt-6 pt-4 border-t border-gray-200 flex flex-col md:flex-row justify-between items-center gap-4">
                <Button
                    type="button"
                    variant="ghost"
                    onClick={handleAICheck}
                    disabled={isAnalyzing}
                    className="text-sm border border-gray-300"
                  >
                    {isAnalyzing ? <Loader2 className="animate-spin" size={16} /> : 'AI 檢查合理性'}
                  </Button>
                
                <div className="text-3xl font-black text-gray-900">
                  總金額: <span className="text-orange-600 border-b-4 border-orange-200">${totalAmount.toLocaleString()}</span>
                </div>
            </div>

             {/* Warnings */}
            {isOverThreshold && (
              <div className="mt-4 p-4 bg-orange-100 border-l-4 border-orange-500 text-orange-800 rounded flex items-start gap-3">
                <AlertCircle className="flex-shrink-0 mt-1" size={24} />
                <div>
                  <strong className="text-lg">金額超過 $15,000</strong>
                  <p>依規定必須先填寫請購單。系統將自動備註此事項。</p>
                </div>
              </div>
            )}
            
            {aiAnalysis && (
              <div className="mt-4 p-4 bg-gray-100 border-l-4 border-gray-600 text-gray-800 rounded flex items-start gap-3 animate-fade-in">
                <Info className="flex-shrink-0 mt-1" size={24} />
                <p>{aiAnalysis}</p>
              </div>
            )}
          </div>
        </Card>

        {/* Section 3: Payment */}
        <Card className="p-6">
           <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
             <span className="bg-black text-white w-6 h-6 rounded text-sm flex items-center justify-center">3</span>
             付款資訊
           </h3>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Option 1: Advance */}
              <div 
                onClick={() => setPaymentMethod(PaymentMethod.ADVANCE)}
                className={`cursor-pointer p-5 rounded-lg border-2 flex flex-col gap-3 transition-all relative ${
                  paymentMethod === PaymentMethod.ADVANCE 
                  ? 'border-orange-500 bg-orange-50 shadow-md' 
                  : 'border-gray-200 hover:border-gray-400'
                }`}
              >
                 <div className="flex justify-between items-center">
                    <div className="font-bold text-xl text-gray-900 flex items-center gap-2">
                      <User size={24}/> 先行代墊
                    </div>
                    {paymentMethod === PaymentMethod.ADVANCE && <CheckCircle2 className="text-orange-500" size={24}/>}
                 </div>
                 <p className="text-gray-500">成員已付款，需學校匯款歸墊。</p>
                 
                 {paymentMethod === PaymentMethod.ADVANCE && (
                   <div className="mt-2 animate-fade-in">
                      <label className="block text-sm font-bold text-gray-900 mb-1">選擇代墊人</label>
                      <select
                        className="w-full p-2 border border-gray-300 rounded text-gray-900 bg-white"
                        value={payerName}
                        onChange={(e) => setPayerName(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {EMPLOYEES.map(emp => (
                          <option key={emp} value={emp}>{emp}</option>
                        ))}
                      </select>
                   </div>
                 )}
              </div>

              {/* Option 2: Direct */}
              <div 
                onClick={() => setPaymentMethod(PaymentMethod.DIRECT)}
                className={`cursor-pointer p-5 rounded-lg border-2 flex flex-col gap-3 transition-all relative ${
                  paymentMethod === PaymentMethod.DIRECT 
                  ? 'border-orange-500 bg-orange-50 shadow-md' 
                  : 'border-gray-200 hover:border-gray-400'
                }`}
              >
                 <div className="flex justify-between items-center">
                    <div className="font-bold text-xl text-gray-900 flex items-center gap-2">
                      <Building2 size={24}/> 逕付廠商
                    </div>
                    {paymentMethod === PaymentMethod.DIRECT && <CheckCircle2 className="text-orange-500" size={24}/>}
                 </div>
                 <p className="text-gray-500">尚未付款，由學校直接匯給廠商。</p>

                 {paymentMethod === PaymentMethod.DIRECT && (
                   <div className="mt-2 animate-fade-in">
                      <label className="block text-sm font-bold text-gray-900 mb-1">廠商統編 (8碼)</label>
                      <input 
                        type="text" 
                        maxLength={8}
                        className="w-full p-2 border border-gray-300 rounded text-gray-900 tracking-widest bg-white"
                        value={vendorTaxId}
                        onChange={(e) => setVendorTaxId(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        placeholder="12345678"
                      />
                   </div>
                 )}
              </div>
           </div>
        </Card>

        {/* Footer Actions */}
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200 shadow-[0_-4px_10px_rgba(0,0,0,0.05)] z-20">
          <div className="max-w-4xl mx-auto flex gap-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onCancel} 
              className="flex-1"
              size="lg"
            >
              取消
            </Button>
            <Button 
              type="submit" 
              variant="primary" 
              disabled={!isCategoryAllowed}
              className="flex-[2] text-xl"
              size="lg"
            >
              確認送出單據
            </Button>
          </div>
        </div>

      </form>
    </div>
  );
};
