import { useNavigate } from 'react-router-dom';

const Splash = () => {
  const navigate = useNavigate();

  const handleStart = () => {
    navigate('/write');
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="bg-card rounded-3xl p-10 flex items-center justify-center">
        {/* Green circle with ORATOR text - acts as button */}
        <button
          onClick={handleStart}
          className="w-40 h-40 rounded-full bg-primary flex items-center justify-center hover:bg-primary/90 transition-colors active:scale-95 border-4 border-primary/30"
        >
          <span className="text-primary-foreground text-xl font-bold tracking-widest">
            ORATOR
          </span>
        </button>
      </div>
    </div>
  );
};

export default Splash;