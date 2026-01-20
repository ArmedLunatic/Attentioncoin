'use client';

import { ReactNode, createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { User } from '@/types';

// Storage key for persisted username
const STORAGE_KEY = 'attention_x_username';

// User context type - simplified for X-based auth
interface UserContextType {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  refreshUser: () => Promise<void>;
  login: (username: string) => Promise<boolean>;
  logout: () => void;
}

const UserContext = createContext<UserContextType>({
  user: null,
  loading: true,
  isAuthenticated: false,
  refreshUser: async () => {},
  login: async () => false,
  logout: () => {},
});

export const useUser = () => useContext(UserContext);

// Helper to get user by X username
async function getUserByXUsername(username: string): Promise<User | null> {
  try {
    const response = await fetch(`/api/user?username=${encodeURIComponent(username)}`);
    if (!response.ok) return null;
    const result = await response.json();
    return result.data?.user || null;
  } catch (error) {
    console.error('Error fetching user by username:', error);
    return null;
  }
}

// Main User Provider
export function UserProvider({ children }: { children: ReactNode }): JSX.Element {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Check for stored username on mount
  useEffect(() => {
    const storedUsername = localStorage.getItem(STORAGE_KEY);
    if (storedUsername) {
      getUserByXUsername(storedUsername).then((fetchedUser) => {
        if (fetchedUser) {
          setUser(fetchedUser);
        } else {
          // User not found in database, clear storage
          localStorage.removeItem(STORAGE_KEY);
        }
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  }, []);

  // Refresh user data from database
  const refreshUser = useCallback(async () => {
    const storedUsername = localStorage.getItem(STORAGE_KEY);
    if (!storedUsername) {
      setUser(null);
      return;
    }

    try {
      const fetchedUser = await getUserByXUsername(storedUsername);
      setUser(fetchedUser);
    } catch (error) {
      console.error('Error refreshing user:', error);
    }
  }, []);

  // Login with X username
  const login = useCallback(async (username: string): Promise<boolean> => {
    const cleanUsername = username.replace('@', '').trim();
    if (!cleanUsername) return false;

    setLoading(true);
    try {
      const fetchedUser = await getUserByXUsername(cleanUsername);
      if (fetchedUser && fetchedUser.x_verified_at) {
        localStorage.setItem(STORAGE_KEY, cleanUsername);
        setUser(fetchedUser);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  // Logout
  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setUser(null);
  }, []);

  const isAuthenticated = !!user && !!user.x_verified_at;

  return (
    <UserContext.Provider value={{ user, loading, isAuthenticated, refreshUser, login, logout }}>
      {children}
    </UserContext.Provider>
  );
}

// Export WalletContextProvider as alias for backward compatibility during migration
export const WalletContextProvider = UserProvider;
