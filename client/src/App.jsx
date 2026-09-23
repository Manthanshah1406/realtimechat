import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth }           from './context/AuthContext';
import LoginPage             from './pages/LoginPage';
import SignupPage            from './pages/SignupPage';
import ChatPage              from './pages/ChatPage';
import ConnectionBanner      from './components/UI/ConnectionBanner';

function ProtectedRoute({ children }) {
  const { token } = useAuth();
  return token ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <>
      <ConnectionBanner />
      <Routes>
        <Route path="/login"  element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <ChatPage />
            </ProtectedRoute>
          }
        />
      </Routes>
    </>
  );
}
