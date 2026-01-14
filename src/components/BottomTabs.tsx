import { useState, useEffect } from 'react';
import { PenLine, Edit3, Settings } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

interface BottomTabsProps {
  text?: string;
}

export const BottomTabs = ({ text = '' }: BottomTabsProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState(location.pathname);
  const [bounceIcon, setBounceIcon] = useState<string | null>(null);

  useEffect(() => {
    setActiveTab(location.pathname);
  }, [location.pathname]);

  const handleNavigate = (path: string) => {
    if (path !== activeTab) {
      setBounceIcon(path);
      setTimeout(() => setBounceIcon(null), 300);
    }
    navigate(path, { state: { text } });
  };

  const tabs = [
    { path: '/write', label: 'Write', icon: PenLine },
    { path: '/edit', label: 'Edit', icon: Edit3 },
    { path: '/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-accent/30 px-6 py-3">
      <div className="max-w-md mx-auto flex items-center justify-around">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.path;
          const Icon = tab.icon;
          const isBouncing = bounceIcon === tab.path;
          
          return (
            <button
              key={tab.path}
              onClick={() => handleNavigate(tab.path)}
              className={`relative flex flex-col items-center gap-1 transition-all duration-200 ripple active:scale-90 ${
                isActive ? 'scale-105' : 'opacity-60 hover:opacity-100 hover:scale-105'
              }`}
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 ${
                isActive ? 'bg-primary shadow-lg shadow-primary/30' : 'bg-muted hover:bg-muted/80'
              }`}>
                <Icon className={`w-5 h-5 transition-transform duration-200 ${
                  isActive ? 'text-primary-foreground' : 'text-foreground'
                } ${isBouncing ? 'icon-bounce' : ''}`} />
              </div>
              <span className={`text-xs transition-all duration-200 ${
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
