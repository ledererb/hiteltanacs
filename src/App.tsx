import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Kanban from './pages/Kanban';
import ClientDetails from './pages/ClientDetails';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<AppLayout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="clients/:id" element={<ClientDetails />} />
          <Route path="kanban" element={<Kanban />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
