
import React from 'react';

export const Card: React.FC<{ children: React.ReactNode; className?: string; onClick?: () => void }> = ({ children, className = '', onClick }) => {
  return (
    <div 
      onClick={onClick}
      className={`bg-white rounded-lg border border-gray-200 shadow-sm ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow hover:border-gray-400' : ''} ${className}`}
    >
      {children}
    </div>
  );
};
