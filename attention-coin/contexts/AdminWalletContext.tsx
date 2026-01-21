'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useWallet, WalletContextState } from '@solana/wallet-adapter-react';

interface AdminWalletContextType {
  isAdminWallet: boolean;
  adminWallet: WalletContextState | null;
  isAdminAuthenticated: boolean;
}

const AdminWalletContext = createContext<AdminWalletContextType | undefined>(undefined);

export function AdminWalletProvider({ children }: { children: ReactNode }) {
  const wallet = useWallet();
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);

  // Only allow wallet access on admin page and when authenticated
  const isAdminWallet = typeof window !== 'undefined' && 
    window.location.pathname === '/admin' && 
    isAdminAuthenticated;

  useEffect(() => {
    // Check if we're on admin page and user is authenticated
    const checkAdminAuth = () => {
      if (window.location.pathname === '/admin') {
        // This will be set by the admin page after successful login
        const adminAuth = sessionStorage.getItem('admin_authenticated');
        setIsAdminAuthenticated(adminAuth === 'true');
      } else {
        setIsAdminAuthenticated(false);
      }
    };

    checkAdminAuth();
    
    // Listen for storage changes (in case admin logs in/out in another tab)
    const handleStorageChange = () => {
      checkAdminAuth();
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const contextValue: AdminWalletContextType = {
    isAdminWallet,
    adminWallet: isAdminWallet ? wallet : null,
    isAdminAuthenticated,
  };

  return (
    <AdminWalletContext.Provider value={contextValue}>
      {children}
    </AdminWalletContext.Provider>
  );
}

export function useAdminWallet() {
  const context = useContext(AdminWalletContext);
  if (context === undefined) {
    throw new Error('useAdminWallet must be used within an AdminWalletProvider');
  }
  return context;
}