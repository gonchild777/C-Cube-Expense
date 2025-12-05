
import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  fullWidth = false,
  className = '',
  ...props 
}) => {
  const baseStyle = "font-medium rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 active:scale-95";
  
  const variants = {
    // Primary: Black background, White text (High Professionalism)
    primary: "bg-gray-900 hover:bg-black text-white focus:ring-gray-700 shadow-md",
    
    // Secondary: Orange (Action/Highlight)
    secondary: "bg-orange-500 hover:bg-orange-600 text-white focus:ring-orange-400 shadow-md",
    
    // Danger: Dark Red
    danger: "bg-red-600 hover:bg-red-700 text-white focus:ring-red-500",
    
    // Outline: Black Border
    outline: "border-2 border-gray-900 hover:bg-gray-100 text-gray-900 focus:ring-gray-500",

    // Ghost: Simple text
    ghost: "bg-transparent hover:bg-gray-100 text-gray-600"
  };

  const sizes = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-5 py-2.5 text-base",
    lg: "px-6 py-3 text-lg",
    xl: "px-8 py-5 text-xl font-bold"
  };

  const widthClass = fullWidth ? "w-full" : "";

  return (
    <button 
      className={`${baseStyle} ${variants[variant]} ${sizes[size]} ${widthClass} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};
