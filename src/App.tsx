import { Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { BoardListPage } from './pages/BoardListPage';
import { BoardDetailPage } from './pages/BoardDetailPage';
import { BoardCreatePage } from './pages/BoardCreatePage';
import { ChatPage } from './pages/ChatPage';

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<DashboardPage />} />
        <Route path="/board" element={<BoardListPage />} />
        <Route path="/board/new" element={<BoardCreatePage />} />
        <Route path="/board/:postNumber" element={<BoardDetailPage />} />
        <Route path="/chat" element={<ChatPage />} />
      </Route>
    </Routes>
  );
}
