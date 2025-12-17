import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requirePaid?: boolean;
}

export const ProtectedRoute = ({ children, requirePaid = false }: ProtectedRouteProps) => {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/signin" replace />;
  }

  if (requirePaid && profile?.subscription_plan !== 'paid') {
    return <Navigate to="/signup?upgrade=true" replace />;
  }

  return <>{children}</>;
};
