import React, { createContext, useContext, useState, useEffect } from 'react';

interface AppSettings {
  user: string;
  zone: string;
  googleConnected: boolean;
  backupEmail: string;
  driveFolderId: string;
}

interface AppContextType {
  settings: AppSettings;
  updateSettings: (newSettings: Partial<AppSettings>) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem('logistica-settings');
    return saved ? JSON.parse(saved) : { user: '', zone: '', googleConnected: false, backupEmail: '', driveFolderId: '' };
  });

  useEffect(() => {
    localStorage.setItem('logistica-settings', JSON.stringify(settings));
  }, [settings]);

  const updateSettings = (newSettings: Partial<AppSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  return (
    <AppContext.Provider value={{ settings, updateSettings }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
}
