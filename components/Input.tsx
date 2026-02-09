import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export const Input: React.FC<InputProps> = ({ label, className = '', ...props }) => {
  return (
    <div className="flex flex-col gap-1 w-full">
      {label && <label className="text-xs text-zinc-400 font-medium ml-1">{label}</label>}
      <input 
        className={`bg-zinc-900 border border-zinc-700 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-600 transition-all placeholder-zinc-600 ${className}`}
        {...props}
      />
    </div>
  );
};