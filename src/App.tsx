import { Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AdminRoute } from './components/AdminRoute';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { LeavePage } from './pages/LeavePage';
import { BoardListPage } from './pages/BoardListPage';
import { BoardDetailPage } from './pages/BoardDetailPage';
import { BoardCreatePage } from './pages/BoardCreatePage';
import { ChatPage } from './pages/ChatPage';
import { AdminEmployeesPage } from './pages/AdminEmployeesPage';

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
        <Route path="/leave" element={<LeavePage />} />
        <Route path="/board" element={<BoardListPage />} />
        <Route path="/board/new" element={<BoardCreatePage />} />
        <Route path="/board/:postNumber" element={<BoardDetailPage />} />
        <Route path="/chat" element={<ChatPage />} />
        <Route
          path="/admin/employees"
          element={
            <AdminRoute>
              <AdminEmployeesPage />
            </AdminRoute>
          }
        />
      </Route>
    </Routes>
  );
}
