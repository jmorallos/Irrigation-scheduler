import { useLocation, Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Programs from './pages/Programs';
import ProgramDetail from './pages/ProgramDetail';
import Zones from './pages/Zones';
import WeeklySchedule from './pages/WeeklySchedule';
import Saves from './pages/Saves';
import Settings from './pages/Settings';

export default function AppRoutes() {
  const location = useLocation();

  return (
    <div key={location.pathname} className="page-transition">
      <Routes location={location}>
        <Route path="/" element={<Navigate to="/programs" replace />} />
        <Route path="/programs" element={<Programs />} />
        <Route path="/programs/:programId" element={<ProgramDetail />} />
        <Route path="/zones" element={<Zones />} />
        <Route path="/saves" element={<Saves />} />
        <Route path="/schedule" element={<WeeklySchedule />} />
        <Route path="/summary" element={<Dashboard />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/programs" replace />} />
      </Routes>
    </div>
  );
}
