import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/layout/Layout';
import LoadingSpinner from './components/ui/LoadingSpinner';

// Public pages
import Landing  from './pages/public/Landing';
import Login    from './pages/public/Login';
import Register from './pages/public/Register';

// Admin pages
import AdminDashboard     from './pages/admin/AdminDashboard';
import AdminDisasters     from './pages/admin/AdminDisasters';
import AdminVictims       from './pages/admin/AdminVictims';
import AdminInventory     from './pages/admin/AdminInventory';
import AdminDistributions from './pages/admin/AdminDistributions';
import AdminVolunteers    from './pages/admin/AdminVolunteers';
import AdminAudit         from './pages/admin/AdminAudit';
import AdminReport        from './pages/admin/AdminReport';

// Citizen pages
import CitizenDashboard from './pages/citizen/CitizenDashboard';
import CitizenRegister  from './pages/citizen/CitizenRegister';
import CitizenTrack     from './pages/citizen/CitizenTrack';

// Volunteer pages
import VolunteerDashboard from './pages/volunteer/VolunteerDashboard';
import VolunteerTask      from './pages/volunteer/VolunteerTask';

// NGO pages
import NgoDashboard from './pages/ngo/NgoDashboard';
import NgoDonate    from './pages/ngo/NgoDonate';

//profile page
import ProfilePage from './pages/shared/ProfilePage';

// ── Protected route wrapper ──
const Protected = ({ children, roles }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="h-screen flex items-center justify-center"><LoadingSpinner size="lg" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
};

// ── Role-based redirect after login ──
const RoleRedirect = () => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  const dest = { admin: '/admin', citizen: '/citizen', volunteer: '/volunteer', ngo: '/ngo' };
  return <Navigate to={dest[user.role] || '/login'} replace />;
};

const AppRoutes = () => (
  <Routes>
    {/* Public */}
    <Route path="/"        element={<Landing />} />
    <Route path="/login"   element={<Login />} />
    <Route path="/register" element={<Register />} />
    <Route path="/dashboard" element={<RoleRedirect />} />

    {/* Protected with sidebar layout */}
    <Route element={<Protected><Layout /></Protected>}>

    {/* Profile — accessible by all logged-in roles */}
  <Route path="/profile" element={<Protected><ProfilePage /></Protected>} />

      {/* Admin */}
      <Route path="/admin" element={<Protected roles={['admin']}><AdminDashboard /></Protected>} />
      <Route path="/admin/disasters" element={<Protected roles={['admin']}><AdminDisasters /></Protected>} />
      <Route path="/admin/victims" element={<Protected roles={['admin']}><AdminVictims /></Protected>} />
      <Route path="/admin/inventory" element={<Protected roles={['admin']}><AdminInventory /></Protected>} />
      <Route path="/admin/distributions" element={<Protected roles={['admin']}><AdminDistributions /></Protected>} />
      <Route path="/admin/volunteers" element={<Protected roles={['admin']}><AdminVolunteers /></Protected>} />
      <Route path="/admin/audit" element={<Protected roles={['admin']}><AdminAudit /></Protected>} />
      <Route path="/admin/report" element={<Protected roles={['admin', 'ngo']}><AdminReport /></Protected>} />

      {/* Citizen */}
      <Route path="/citizen" element={<Protected roles={['citizen']}><CitizenDashboard /></Protected>} />
      <Route path="/citizen/register" element={<Protected roles={['citizen']}><CitizenRegister /></Protected>} />
      <Route path="/citizen/track" element={<Protected roles={['citizen']}><CitizenTrack /></Protected>} />
      <Route path="/citizen/map" element={<Protected roles={['citizen']}><CitizenDashboard /></Protected>} />

      {/* Volunteer */}
      <Route path="/volunteer" element={<Protected roles={['volunteer']}><VolunteerDashboard /></Protected>} />
      <Route path="/volunteer/tasks" element={<Protected roles={['volunteer']}><VolunteerTask /></Protected>} />

      {/* NGO */}
      <Route path="/ngo" element={<Protected roles={['ngo']}><NgoDashboard /></Protected>} />
      <Route path="/ngo/donate" element={<Protected roles={['ngo']}><NgoDonate /></Protected>} />
      <Route path="/ngo/inventory" element={<Protected roles={['ngo']}><NgoDashboard /></Protected>} />
    </Route>

    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
);

const App = () => (
  <AuthProvider>
    <AppRoutes />
  </AuthProvider>
);
export default App;