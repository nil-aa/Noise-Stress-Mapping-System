import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import App from "./App";
import ProtectedRoute from "./components/ProtectedRoute";
import Insights from "./pages/Insights";
import Landing from "./pages/Landing";
import Laws from "./pages/Laws";
import Login from "./pages/Login";
import Register from "./pages/Register";
import "./index.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <App />
            </ProtectedRoute>
          }
        />
        <Route path="/insights" element={<Insights />} />
        <Route path="/laws" element={<Laws />} />
        <Route path="*" element={<Navigate replace to="/" />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>
);
