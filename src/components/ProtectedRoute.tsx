import { Navigate, useLocation } from "react-router-dom";
import { useStore } from "@/shared/state/useStore";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user } = useStore();
  const location = useLocation();

  if (!user) {
    // Save the attempted URL to redirect back after login
    sessionStorage.setItem("redirectAfterLogin", location.pathname);
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
