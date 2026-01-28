
import React from 'react';
import { View } from '../types';
import { useNetwork } from '../contexts/NetworkContext';

interface NavProps {
  currentView: View;
  onNavigate: (view: View) => void;
}

export const Navbar: React.FC<NavProps> = ({ currentView, onNavigate }) => {
  const items = [
    { view: View.DASHBOARD, icon: 'home', label: 'Início' },
    { view: View.REVIEWS, icon: 'menu_book', label: 'Estudo' },
    { view: View.ADD_THEME, icon: 'add', label: 'Adicionar' },
    { view: View.ANALYTICS, icon: 'bar_chart', label: 'Estatísticas' },
    { view: View.SETTINGS, icon: 'settings', label: 'Configurações' },
  ];

  return (
    <nav className="w-full h-[72px] bg-white dark:bg-card-dark border-t border-slate-200 dark:border-slate-800">
      <div className="max-w-6xl mx-auto h-full flex items-center justify-around px-2 pb-safe">
        {items.map((item) => {
          if (item.view === View.ADD_THEME) {
            return (
              <div key={item.view} className="flex flex-col items-center justify-center w-16 h-full relative cursor-pointer" onClick={() => onNavigate(item.view)}>
                <div className="absolute -top-6 bg-white dark:bg-card-dark p-1.5 rounded-full border-t border-border-light dark:border-border-dark">
                  <div className="flex items-center justify-center w-12 h-12 bg-primary text-white rounded-full shadow-lg shadow-primary/30">
                    <span className="material-symbols-outlined text-2xl">{item.icon}</span>
                  </div>
                </div>
                <span className="text-[10px] font-medium text-primary mt-8">{item.label}</span>
              </div>
            );
          }

          return (
            <button
              key={item.view}
              onClick={() => onNavigate(item.view)}
              className={`flex flex-col items-center justify-center w-16 h-full transition-colors gap-1 ${currentView === item.view ? 'text-primary' : 'text-slate-400 dark:text-[#92a4c9] hover:text-primary dark:hover:text-primary'
                }`}
            >
              <span className={`material-symbols-outlined text-2xl ${currentView === item.view ? 'filled' : ''}`}>
                {item.icon}
              </span>
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

interface HeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  onCalendar?: () => void;
  onInfo?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ title, subtitle, onBack, onCalendar, onInfo }) => {
  const { isOnline } = useNetwork();

  return (
    <header className="bg-white/80 dark:bg-background-dark/80 backdrop-blur-md border-b border-gray-100 dark:border-gray-800 w-full relative">
      {!isOnline && (
        <div className="bg-red-500 text-white text-[10px] font-bold text-center py-1">
          Sem conexão. Funcionalidades limitadas.
        </div>
      )}
      <div className="flex items-center justify-between px-6 py-3 lg:py-4 w-full mx-auto relative">
        <div className="flex items-center gap-3 relative z-10 w-1/3">
          {onBack && (
            <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors">
              <span className="material-symbols-outlined text-2xl">arrow_back</span>
            </button>
          )}
          <div className="flex flex-col min-w-0">
            {subtitle && <h2 className="text-[10px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate">{subtitle}</h2>}
            <h1 className="text-sm lg:text-base font-bold text-slate-900 dark:text-white leading-tight truncate">{title}</h1>
          </div>
        </div>

        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center z-20">
          <img src="/favicon_io/apple-touch-icon.png" className="h-9 w-9 rounded-lg shadow-sm" alt="Logo" />
        </div>

        <div className="flex items-center gap-1 relative z-10 w-1/3 justify-end">
          {onInfo && (
            <button onClick={onInfo} className="p-2 rounded-full hover:bg-slate-200 text-slate-600 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors">
              <span className="material-symbols-outlined text-2xl">info</span>
            </button>
          )}
          {onCalendar && (
            <button onClick={onCalendar} className="p-2 rounded-full hover:bg-slate-200 text-slate-600 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors">
              <span className="material-symbols-outlined text-2xl">calendar_month</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
