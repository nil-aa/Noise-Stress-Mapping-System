import React from "react";
import { Navigate, useLocation } from "react-router-dom";

function ProtectedRoute({ children }) {
  const location = useLocation();
  const token = localStorage.getItem("token");

  if (!token) {
    return <Navigate replace state={{ from: location.pathname }} to="/login" />;
  }

  return children;
}

export default ProtectedRoute;
