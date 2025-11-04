
import React from 'react';
import ThemeToggle from './ThemeToggle';
import type { Page } from '../types';

interface HeaderProps {
  currentPage: Page;
  setPage: (page: Page) => void;
}

const Header: React.FC<HeaderProps> = ({ currentPage, setPage }) => {
  const NavLink: React.FC<{ pageName: Page; children: React.ReactNode }> = ({ pageName, children }) => {
    const isActive = currentPage === pageName;
    return (
      <button
        onClick={() => setPage(pageName)}
        className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
          isActive
            ? 'bg-primary-500 text-white'
            : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
        }`}
      >
        {children}
      </button>
    );
  };

  return (
    <header className="bg-white dark:bg-gray-800 shadow-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <svg className="w-8 h-8 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 7v10m16-10v10M4 11h16M4 17h16" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 21V3m4 18V3" />
            </svg>
            <h1 className="text-xl font-bold ml-2 text-gray-900 dark:text-white">
              Smart File Converter Pro
            </h1>
          </div>
          <div className="flex items-center space-x-4">
            <nav className="flex space-x-2">
              <NavLink pageName="dashboard">Dashboard</NavLink>
              <NavLink pageName="history">History</NavLink>
            </nav>
            <ThemeToggle />
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
