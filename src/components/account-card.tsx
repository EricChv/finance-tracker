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
  'bg-[#433D3C]', // Dark Brown/Gray
  'bg-[#7D5A50]', // Warm Brown
  'bg-[#B4846C]', // Muted Orange
  'bg-[#3E4A3D]', // Muted Deep Green
  'bg-[#6D8299]', // Soft Blue-Gray
  'bg-[#A0937D]', // Warm Beige-Green
];


const AccountCard: React.FC<AccountCardProps> = ({ account, index = 0, onDelete, showDeleteButton }) => {
  if (!account) return <div className="p-6 text-center text-gray-500">No account found.</div>;

  return (
    <div
      className={`relative w-full max-w-md aspect-[1.586/1] 
        p-5 sm:p-6 md:p-7 rounded-[1.8rem] md:rounded-[2.5rem] 
        /* Modern Shadow Stack */
        shadow-lg hover:shadow-xl
        /* Interaction */
        hover:-translate-y-1 transition-all duration-300 ease-out
        ${colors[index % colors.length]} 
        text-white border border-white/10 ring-1 ring-inset ring-white/20
        flex-shrink-0 overflow-hidden min-h-[200px] group`}
    >
      {/* Decorative Gradient Overlay for depth */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-black/5 pointer-events-none" />

      {/* Delete Button */}
      {showDeleteButton && onDelete && (
        <button
          onClick={() => onDelete(account.id)}
          className="absolute top-3 right-3 sm:top-5 sm:right-5 z-10 flex items-center justify-center 
                     w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/20 hover:bg-red-500/90 
                     backdrop-blur-md transition-all border border-white/20 shadow-lg"
          title="Remove Account"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="w-3.5 h-3.5 sm:w-4 sm:h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}

      <div className="relative flex flex-col h-full justify-between z-1">
        {/* Header: Name and Logo */}
        <div className="flex justify-between items-start pr-8">
          <div className="text-lg sm:text-xl md:text-xl font-semibold tracking-tight leading-tight line-clamp-2">
            {account.institution_name || 'Bank Account'}
          </div>
        </div>

        {/* Center: Account Info */}
        <div className="mt-2 md:mt-4">
          <p className="text-[9px] md:text-[10px] opacity-80 uppercase tracking-widest font-bold truncate">
            {account.name}
          </p>
          <p className="text-base sm:text-lg md:text-lg tracking-[0.15em] font-mono mt-1">
            **** **** **** {account.account_number_last_four || '----'}
          </p>
        </div>

        {/* Bottom: Balance */}
        <div className="flex justify-between items-end">
          <div className="overflow-hidden">
            <p className="text-[9px] md:text-[10px] opacity-70 uppercase tracking-wider">Available Balance</p>
            <p className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tighter truncate">
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
