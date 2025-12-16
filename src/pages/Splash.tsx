import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';

const Splash = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Auto-navigate after 2 seconds or on tap
    const timer = setTimeout(() => {
      navigate('/write');
    }, 2000);

    return () => clearTimeout(timer);
  }, [navigate]);

  const handleTap = () => {
    navigate('/write');
  };

  return (
    <div 
      className="min-h-screen bg-background flex items-center justify-center cursor-pointer"
      onClick={handleTap}
    >
      <div className="relative">
        {/* Purple/gray border square */}
        <div className="w-64 h-64 border-4 border-accent rounded-lg flex items-center justify-center">
          {/* Green circle with ORATOR text */}
          <div className="w-48 h-48 rounded-full bg-primary flex items-center justify-center">
            <span className="text-primary-foreground text-3xl font-bold tracking-wider">
              ORATOR
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Splash;