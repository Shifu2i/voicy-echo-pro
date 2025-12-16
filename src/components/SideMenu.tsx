import { X, PenLine, Edit3, Info, Settings } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

interface SideMenuProps {
  isOpen: boolean;
  onClose: () => void;
  text?: string;
}

export const SideMenu = ({ isOpen, onClose, text = '' }: SideMenuProps) => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleNavigate = (path: string) => {
    onClose();
    navigate(path, { state: { text } });
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-foreground/20 z-40"
        onClick={onClose}
      />
      
      {/* Menu */}
      <div className="fixed top-0 right-0 h-full w-64 bg-background border-l border-accent z-50 p-6">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2"
        >
          <X className="w-6 h-6 text-foreground" />
        </button>

        <nav className="mt-12 space-y-4">
          <button
            onClick={() => handleNavigate('/write')}
            className={`flex items-center gap-3 w-full p-3 rounded-lg transition-colors ${
              location.pathname === '/write' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
            }`}
          >
            <PenLine className="w-5 h-5" />
            <span className="font-medium">Write</span>
          </button>

          <button
            onClick={() => handleNavigate('/edit')}
            className={`flex items-center gap-3 w-full p-3 rounded-lg transition-colors ${
              location.pathname === '/edit' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
            }`}
          >
            <Edit3 className="w-5 h-5" />
            <span className="font-medium">Edit</span>
          </button>

          <button
            onClick={() => handleNavigate('/settings')}
            className={`flex items-center gap-3 w-full p-3 rounded-lg transition-colors ${
              location.pathname === '/settings' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
            }`}
          >
            <Settings className="w-5 h-5" />
            <span className="font-medium">Settings</span>
          </button>

          <button
            onClick={() => handleNavigate('/info')}
            className={`flex items-center gap-3 w-full p-3 rounded-lg transition-colors ${
              location.pathname === '/info' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
            }`}
          >
            <Info className="w-5 h-5" />
            <span className="font-medium">Info</span>
          </button>
        </nav>
      </div>
    </>
  );
};