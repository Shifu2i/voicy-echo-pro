import { PenLine, Edit3, Settings, Lock } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface BottomTabsProps {
  text?: string;
}

export const BottomTabs = ({ text = '' }: BottomTabsProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile } = useAuth();

  const isPaidUser = profile?.subscription_plan === 'paid';

  const handleNavigate = (path: string, requiresPaid: boolean) => {
    if (requiresPaid && !isPaidUser) {
      toast.info('Edit feature requires Pro plan');
      navigate('/signup?upgrade=true', { state: { text } });
      return;
    }
    navigate(path, { state: { text } });
  };

  const tabs = [
    { path: '/write', label: 'Write', icon: PenLine, requiresPaid: false },
    { path: '/edit', label: 'Edit', icon: Edit3, requiresPaid: true },
    { path: '/settings', label: 'Settings', icon: Settings, requiresPaid: false },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-accent/30 px-6 py-3">
      <div className="max-w-md mx-auto flex items-center justify-around">
        {tabs.map((tab) => {
          const isActive = location.pathname === tab.path;
          const Icon = tab.icon;
          const isLocked = tab.requiresPaid && !isPaidUser;
          
          return (
            <button
              key={tab.path}
              onClick={() => handleNavigate(tab.path, tab.requiresPaid)}
              className={`flex flex-col items-center gap-1 transition-all duration-200 ${
                isActive ? 'scale-105' : 'opacity-60 hover:opacity-100'
              } ${isLocked ? 'opacity-40' : ''}`}
            >
              <div className={`relative w-10 h-10 rounded-full flex items-center justify-center ${
                isActive ? 'bg-primary' : 'bg-muted'
              }`}>
                <Icon className={`w-5 h-5 ${
                  isActive ? 'text-primary-foreground' : 'text-foreground'
                }`} />
                {isLocked && (
                  <Lock className="absolute -top-1 -right-1 w-3 h-3 text-foreground" />
                )}
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
