'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

interface AdminWalletContextType {
  isAdminAuthenticated: boolean;
}

const AdminWalletContext = createContext<AdminWalletContextType | undefined>(undefined);

export function AdminWalletProvider({ children }: { children: ReactNode }) {
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);

  useEffect(() => {
    // Check if we're on admin page and user is authenticated
    const checkAdminAuth = () => {
      if (typeof window !== 'undefined' && window.location.pathname === '/admin') {
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
    
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', handleStorageChange);
      return () => window.removeEventListener('storage', handleStorageChange);
    }
  }, []);

  const contextValue: AdminWalletContextType = {
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