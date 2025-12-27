import React from 'react';

type PlaidAccount = {
  id: string;
  name: string;
  type: string;
  balance: number;
  account_number_last_four?: string;
  institution_name?: string;
  institution_logo?: string;
  expiry?: string;
};

import { Button } from "@/components/ui/button";

type AccountCardProps = {
  account: PlaidAccount;
  index?: number;
  onDelete?: (id: string) => void;
  showDeleteButton?: boolean;
};

const colors = [
  'bg-[#B33F24]', // Burnt Terracotta
  'bg-[#2D5A27]', // Forest Grove
  'bg-[#936639]', // Leather Brown
  'bg-[#704264]', // Muted Plum
  'bg-[#1E5F74]', // Deep Petrol Blue
  'bg-[#A67C00]', // Harvest Gold
  'bg-[#4A5D23]', // Moss Green
  'bg-[#8D3B3B]', // Oxblood Red
  'bg-[#524B80]', // Slate Lavender
];


const AccountCard: React.FC<AccountCardProps> = ({ account, index = 0, onDelete, showDeleteButton }) => {
  if (!account) return <div className="p-6 text-center text-gray-500">No account found.</div>;

  return (
    <div
      className={`relative max-w-md h-64 p-7 rounded-[2.5rem] shadow-xl
        transition-all duration-300 ease-in-out  
        ${colors[index % colors.length]} 
        text-white
        border border-white/10
        ring-1 ring-inset ring-white/30`}
    >
      {/* Delete Button - Positioned absolutely for a cleaner look */}
      {showDeleteButton && onDelete && (
        <button
          onClick={() => onDelete(account.id)}
          className="absolute top-5 right-5 z-10 flex items-center justify-center w-8 h-8 
                     rounded-full bg-white/20 hover:bg-red-500/80 backdrop-blur-md 
                     transition-colors duration-200 group"
          title="Remove Account"
        >
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            fill="none" 
            viewBox="0 0 24 24" 
            strokeWidth="2.5" 
            stroke="currentColor" 
            className="w-4 h-4 text-white"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}

      <div className="flex flex-col h-full justify-between">
        {/* Header: Name and Logo */}
        <div className="flex justify-between items-start pr-10"> {/* Added padding-right to avoid X overlap */}
          <div className="text-2xl font-semibold tracking-tight leading-tight">
            {account.institution_name || 'Bank Account'}
          </div>
          {account.institution_logo && (
            <img 
              src={account.institution_logo} 
              alt="logo" 
              className="w-10 h-10 object-contain opacity-90 rounded-lg" 
            />
          )}
        </div>

        {/* Center: Account Info */}
        <div className="mt-4">
          <p className="text-xs opacity-70 uppercase tracking-widest font-medium">
            {account.name}
          </p>
          <p className="text-xl tracking-[0.2em] font-mono mt-1">
            **** **** **** {account.account_number_last_four || '----'}
          </p>
        </div>

        {/* Bottom: Balance */}
        <div className="flex justify-between items-end">
          <div>
            <p className="text-[10px] opacity-60 uppercase tracking-wider">Available Balance</p>
            <p className="text-3xl font-bold tracking-tighter">
              ${account.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccountCard;
export { AccountCard };
