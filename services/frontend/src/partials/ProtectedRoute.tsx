import { ReactElement } from "react";
import { Navigate } from "react-router-dom";

export type ProtectedRouteProps = {
  isAuthenticated: boolean;
  authenticationPath: string;
  outlet: ReactElement;
};

export default function ProtectedRoute({
  isAuthenticated,
  authenticationPath,
  outlet
}: ProtectedRouteProps) {
  if (isAuthenticated) {
    return outlet;
  } else {
    return <Navigate to={{ pathname: authenticationPath }} />;
  }
}
