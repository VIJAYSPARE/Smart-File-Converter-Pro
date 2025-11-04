
import React, { useState } from 'react';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import HistoryPage from './components/HistoryPage';
import { ThemeProvider } from './hooks/useTheme';
import { HistoryProvider } from './hooks/useHistory';
import type { Page } from './types';

function App() {
  const [page, setPage] = useState<Page>('dashboard');

  return (
    <ThemeProvider>
      <HistoryProvider>
        <div className="min-h-screen text-gray-800 dark:text-gray-200 bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
          <Header currentPage={page} setPage={setPage} />
          <main className="p-4 sm:p-6 md:p-8">
            {page === 'dashboard' && <Dashboard />}
            {page === 'history' && <HistoryPage />}
          </main>
        </div>
      </HistoryProvider>
    </ThemeProvider>
  );
}

export default App;
