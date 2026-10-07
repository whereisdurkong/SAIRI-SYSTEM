import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";

import "assets/plugins/nucleo/css/nucleo.css";
import "@fortawesome/fontawesome-free/css/all.min.css";
import "assets/scss/argon-dashboard-react.scss";

import AdminLayout from "layouts/Admin.js";
import AuthLayout from "layouts/Auth.js";
import { NotificationProvider } from "components/Safetynotification.jsx"; // adjust path

const ProtectedRoute = ({ children }) => {
  const isAuthenticated = localStorage.getItem("user") !== null;
  return isAuthenticated ? children : <Navigate to="/auth/auth-login" replace />;
};

const root = ReactDOM.createRoot(document.getElementById("root"));

root.render(
  <NotificationProvider position="top-right">
    <BrowserRouter>
      <Routes>
        <Route
          path="/admin/*"
          element={
            <ProtectedRoute>
              <AdminLayout />
            </ProtectedRoute>
          }
        />
        <Route path="/auth/*" element={<AuthLayout />} />
        <Route path="*" element={<Navigate to="/auth/auth-login" replace />} />
      </Routes>
    </BrowserRouter>
  </NotificationProvider>
);