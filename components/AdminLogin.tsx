
import React, { useState } from 'react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Lock } from 'lucide-react';

interface AdminLoginProps {
  onLogin: () => void;
  onCancel: () => void;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({ onLogin, onCancel }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real app, verify against backend. For demo/simple usage:
    if (password === 'admin888') { // Hardcoded simple password
      onLogin();
    } else {
      setError('密碼錯誤，請重試');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <Card className="w-full max-w-md p-8 bg-white relative shadow-2xl">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-black rounded-full flex items-center justify-center mx-auto mb-4 text-orange-500">
            <Lock size={32} />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">管理員登入</h2>
          <p className="text-gray-500 mt-2">請輸入管理密碼以查看經費總覽</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <input
              type="password"
              autoFocus
              placeholder="請輸入密碼"
              className="w-full text-center text-2xl p-4 rounded-lg tracking-widest bg-gray-900 text-white border-2 border-gray-700 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 placeholder-gray-500 transition-all"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError('');
              }}
            />
            {error && <p className="text-red-600 text-center mt-2 font-bold">{error}</p>}
          </div>

          <div className="flex gap-4">
            <Button type="button" variant="outline" fullWidth onClick={onCancel} size="lg">
              取消
            </Button>
            <Button type="submit" variant="primary" fullWidth size="lg">
              登入
            </Button>
          </div>
        </form>
        
        <div className="mt-4 text-center text-sm text-gray-400">
          (預設密碼: admin888)
        </div>
      </Card>
    </div>
  );
};
