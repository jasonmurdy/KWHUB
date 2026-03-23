import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { db, auth } from '../services/firebase';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

export type ThemeType = 'default' | 'elite' | 'dynamic' | 'nature' | 'ocean' | 'sunset' | 'cyberpunk' | 'nordic' | 'dashboard';

interface ThemeContextType {
  theme: ThemeType;
  setTheme: (theme: ThemeType) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeType>(() => {
    const storedTheme = localStorage.getItem('kwhub-theme');
    return (storedTheme as ThemeType) || 'default';
  });

  // Sync theme to DOM attribute
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('kwhub-theme', theme);
  }, [theme]);

  // Load theme from Firestore on auth change
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            if (userData.themePreference) {
              setThemeState(userData.themePreference as ThemeType);
            }
          }
        } catch (error) {
          console.error("Error loading theme preference:", error);
        }
      }
    });
    return unsubscribe;
  }, []);

  const setTheme = async (newTheme: ThemeType) => {
    setThemeState(newTheme);
    const user = auth.currentUser;
    if (user) {
      try {
        await updateDoc(doc(db, 'users', user.uid), {
          themePreference: newTheme
        });
      } catch (error) {
        console.error("Error saving theme preference:", error);
      }
    }
  };

  const value = useMemo(() => ({ theme, setTheme }), [theme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};