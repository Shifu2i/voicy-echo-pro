import { X, PenLine, Edit3, Info, Settings, LogIn, UserPlus } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface SideMenuProps {
  isOpen: boolean;
  onClose: () => void;
  text?: string;
}

export const SideMenu = ({ isOpen, onClose, text = '' }: SideMenuProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const handleNavigate = (path: string) => {
    onClose();
    navigate(path, { state: { text } });
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-40 animate-fade-backdrop"
        onClick={onClose}
      />
      
      {/* Menu */}
      <div className="fixed top-0 right-0 h-full w-64 bg-background border-l border-accent z-50 p-6 animate-slide-in-right">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 transition-all duration-150 hover:bg-muted rounded-lg active:scale-90"
        >
          <X className="w-6 h-6 text-foreground transition-transform duration-200 hover:rotate-90" />
        </button>

        <nav className="mt-12 space-y-2">
          <button
            onClick={() => handleNavigate('/write')}
            style={{ animationDelay: '0.05s' }}
            className={`flex items-center gap-3 w-full p-3 rounded-lg transition-all duration-150 opacity-0 animate-fade-up active:scale-[0.98] ${
              location.pathname === '/write' ? 'bg-primary text-primary-foreground shadow-md' : 'hover:bg-muted hover:translate-x-1'
            }`}
          >
            <PenLine className="w-5 h-5" />
            <span className="font-medium">Write</span>
          </button>

          <button
            onClick={() => handleNavigate('/edit')}
            style={{ animationDelay: '0.1s' }}
            className={`flex items-center gap-3 w-full p-3 rounded-lg transition-all duration-150 opacity-0 animate-fade-up active:scale-[0.98] ${
              location.pathname === '/edit' ? 'bg-primary text-primary-foreground shadow-md' : 'hover:bg-muted hover:translate-x-1'
            }`}
          >
            <Edit3 className="w-5 h-5" />
            <span className="font-medium">Edit</span>
          </button>

          <button
            onClick={() => handleNavigate('/settings')}
            style={{ animationDelay: '0.15s' }}
            className={`flex items-center gap-3 w-full p-3 rounded-lg transition-all duration-150 opacity-0 animate-fade-up active:scale-[0.98] ${
              location.pathname === '/settings' ? 'bg-primary text-primary-foreground shadow-md' : 'hover:bg-muted hover:translate-x-1'
            }`}
          >
            <Settings className="w-5 h-5" />
            <span className="font-medium">Settings</span>
          </button>

          <button
            onClick={() => handleNavigate('/info')}
            style={{ animationDelay: '0.2s' }}
            className={`flex items-center gap-3 w-full p-3 rounded-lg transition-all duration-150 opacity-0 animate-fade-up active:scale-[0.98] ${
              location.pathname === '/info' ? 'bg-primary text-primary-foreground shadow-md' : 'hover:bg-muted hover:translate-x-1'
            }`}
          >
            <Info className="w-5 h-5" />
            <span className="font-medium">Info</span>
          </button>

          <div className="border-t border-accent/30 my-4 opacity-0 animate-fade-up" style={{ animationDelay: '0.25s' }} />

          {user ? (
            <div className="text-sm text-muted-foreground px-3 opacity-0 animate-fade-up" style={{ animationDelay: '0.3s' }}>
              Signed in as {user.email}
            </div>
          ) : (
            <>
              <button
                onClick={() => handleNavigate('/signin')}
                style={{ animationDelay: '0.3s' }}
                className={`flex items-center gap-3 w-full p-3 rounded-lg transition-all duration-150 opacity-0 animate-fade-up active:scale-[0.98] ${
                  location.pathname === '/signin' ? 'bg-primary text-primary-foreground shadow-md' : 'hover:bg-muted hover:translate-x-1'
                }`}
              >
                <LogIn className="w-5 h-5" />
                <span className="font-medium">Sign In</span>
              </button>

              <button
                onClick={() => handleNavigate('/signup')}
                style={{ animationDelay: '0.35s' }}
                className={`flex items-center gap-3 w-full p-3 rounded-lg transition-all duration-150 opacity-0 animate-fade-up active:scale-[0.98] ${
                  location.pathname === '/signup' ? 'bg-primary text-primary-foreground shadow-md' : 'hover:bg-muted hover:translate-x-1'
                }`}
              >
                <UserPlus className="w-5 h-5" />
                <span className="font-medium">Sign Up</span>
              </button>
            </>
          )}
        </nav>
      </div>
    </>
  );
};
