import { PenLine, Edit3, Settings } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

interface BottomTabsProps {
  text?: string;
}

export const BottomTabs = ({ text = '' }: BottomTabsProps) => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleNavigate = (path: string) => {
    navigate(path, { state: { text } });
  };

  const tabs = [
    { path: '/write', label: 'Write', icon: PenLine },
    { path: '/edit', label: 'Edit', icon: Edit3 },
    { path: '/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="shrink-0 bg-background border-t border-accent/30 px-6 py-3 safe-area-pb">
      <div className="max-w-md mx-auto flex items-center justify-around">
        {tabs.map((tab) => {
          const isActive = location.pathname === tab.path;
          const Icon = tab.icon;
          
          return (
            <button
              key={tab.path}
              onClick={() => handleNavigate(tab.path)}
              className={`flex flex-col items-center gap-1 transition-all duration-200 ${
                isActive ? 'scale-105' : 'opacity-60 hover:opacity-100'
              }`}
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                isActive ? 'bg-primary' : 'bg-muted'
              }`}>
                <Icon className={`w-5 h-5 ${
                  isActive ? 'text-primary-foreground' : 'text-foreground'
                }`} />
              </div>
              <span className={`text-xs ${
                isActive ? 'font-medium text-foreground' : 'text-muted-foreground'
              }`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
