import { useNavigate } from 'react-router-dom';

const Splash = () => {
  const navigate = useNavigate();

  const handleStart = () => {
    navigate('/write');
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="relative">
        {/* Purple/gray border square */}
        <div className="w-64 h-64 border-4 border-accent rounded-lg flex items-center justify-center">
          {/* Green circle with ORATOR text - acts as button */}
          <button
            onClick={handleStart}
            className="w-48 h-48 rounded-full bg-primary flex items-center justify-center hover:bg-primary/90 transition-colors active:scale-95"
          >
            <span className="text-primary-foreground text-3xl font-bold tracking-wider">
              ORATOR
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Splash;