// Fix: Import React to make React.FC, React.ReactNode, and React.createElement available.
import React, { useState, useEffect, createContext, useContext, useMemo, useCallback } from 'react';
import type { ConversionTask } from '../types';

interface HistoryContextType {
  history: ConversionTask[];
  addHistoryItem: (item: ConversionTask) => void;
  removeHistoryItem: (id: string) => void;
  clearHistory: () => void;
}

const HistoryContext = createContext<HistoryContextType | undefined>(undefined);

export const HistoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [history, setHistory] = useState<ConversionTask[]>([]);

  useEffect(() => {
    try {
      const savedHistory = localStorage.getItem('conversionHistory');
      if (savedHistory) {
        setHistory(JSON.parse(savedHistory));
      }
    } catch (error) {
      console.error("Failed to load history from localStorage", error);
      setHistory([]);
    }
  }, []);

  const updateLocalStorage = (newHistory: ConversionTask[]) => {
    try {
      localStorage.setItem('conversionHistory', JSON.stringify(newHistory));
    } catch (error) {
      console.error("Failed to save history to localStorage", error);
    }
  };

  const addHistoryItem = useCallback((item: ConversionTask) => {
    setHistory((prevHistory) => {
      const newHistory = [item, ...prevHistory];
      updateLocalStorage(newHistory);
      return newHistory;
    });
  }, []);

  const removeHistoryItem = useCallback((id: string) => {
    setHistory((prevHistory) => {
      const newHistory = prevHistory.filter((item) => item.id !== id);
      updateLocalStorage(newHistory);
      return newHistory;
    });
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
    updateLocalStorage([]);
  }, []);

  const value = useMemo(() => ({ history, addHistoryItem, removeHistoryItem, clearHistory }), [history, addHistoryItem, removeHistoryItem, clearHistory]);

  // Fix: Replaced JSX with React.createElement to be valid in a .ts file.
  return React.createElement(HistoryContext.Provider, { value }, children);
};


export const useHistory = (): HistoryContextType => {
  const context = useContext(HistoryContext);
  if (context === undefined) {
    throw new Error('useHistory must be used within a HistoryProvider');
  }
  return context;
};
