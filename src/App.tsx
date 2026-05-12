import React from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import AnimatedPage from "./components/AnimatedPage";
import { Toaster } from "react-hot-toast";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Navbar from "./components/Navbar";
import ErrorBoundary from "./components/ErrorBoundary";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Chatbot from "./pages/Chatbot";
import Dashboard from "./pages/Dashboard";
import ComplaintForm from "./pages/ComplaintForm";
import ComplaintDetail from "./pages/ComplaintDetail";
import AdminDashboard from "./pages/AdminDashboard";
import HealthcareAI from "./pages/HealthcareAI";
import OfficerDashboard from "./pages/OfficerDashboard";
import PatientProfileForm from "./pages/PatientProfileForm";
import AnonymousComplaintForm from "./pages/AnonymousComplaintForm";
import TrackComplaint from "./pages/TrackComplaint";

const PrivateRoute: React.FC<{ children: React.ReactNode; adminOnly?: boolean }> = ({ children, adminOnly }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && user.role === "citizen") return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
};

const AppRoutes: React.FC = () => {
  const location = useLocation();
  return (
    <>
      <Navbar />
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<AnimatedPage><Home /></AnimatedPage>} />
          <Route path="/login" element={<AnimatedPage><Login /></AnimatedPage>} />
          <Route path="/signup" element={<AnimatedPage><Signup /></AnimatedPage>} />
          <Route path="/chatbot" element={<PrivateRoute><AnimatedPage><Chatbot /></AnimatedPage></PrivateRoute>} />
          <Route path="/dashboard" element={<PrivateRoute><AnimatedPage><Dashboard /></AnimatedPage></PrivateRoute>} />
          <Route path="/officer" element={<PrivateRoute><AnimatedPage><OfficerDashboard /></AnimatedPage></PrivateRoute>} />
          <Route path="/complaints/new" element={<PrivateRoute><AnimatedPage><ComplaintForm /></AnimatedPage></PrivateRoute>} />
          <Route path="/complaints/:id" element={<PrivateRoute><AnimatedPage><ComplaintDetail /></AnimatedPage></PrivateRoute>} />
          <Route path="/healthcare" element={<PrivateRoute><AnimatedPage><HealthcareAI /></AnimatedPage></PrivateRoute>} />
          <Route path="/health-profile" element={<PrivateRoute><AnimatedPage><PatientProfileForm /></AnimatedPage></PrivateRoute>} />
          <Route path="/anonymous" element={<AnimatedPage><AnonymousComplaintForm /></AnimatedPage>} />
          <Route path="/track/:code" element={<AnimatedPage><TrackComplaint /></AnimatedPage>} />
          <Route path="/admin" element={<PrivateRoute adminOnly><AnimatedPage><AdminDashboard /></AnimatedPage></PrivateRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AnimatePresence>
    </>
  );
};

const App: React.FC = () => (
  <ErrorBoundary>
    <GoogleOAuthProvider clientId={process.env.REACT_APP_GOOGLE_CLIENT_ID || ""}>
      <AuthProvider>
        <BrowserRouter>
          <div style={{ minHeight: "100vh", position: "relative", zIndex: 1 }}>
            <Toaster position="top-right" toastOptions={{
              style: { background: "#3a3050", color: "#f0ece8", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 14 },
            }} />
            <AppRoutes />
          </div>
        </BrowserRouter>
      </AuthProvider>
    </GoogleOAuthProvider>
  </ErrorBoundary>
);

export default App;
