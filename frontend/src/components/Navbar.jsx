import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Stethoscope, CalendarDays, UserPlus, LogOut, Users, Calendar } from 'lucide-react';
import { getUser, clearAuth } from '../utils/auth';

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = getUser();

  function logout() { clearAuth(); navigate('/login'); }

  const linkClass = (path) =>
    `flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-md transition-colors duration-150 ${
      location.pathname.startsWith(path)
        ? 'bg-blue-800 text-white'
        : 'text-blue-100 hover:bg-blue-800 hover:text-white'
    }`;

  return (
    <nav className="bg-blue-700 shadow-md">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 font-bold text-white text-base tracking-tight">
          <Stethoscope size={20} />
          HealthCare
        </Link>
        <div className="flex items-center gap-1">
          {user?.role === 'patient' && <>
            <Link to="/patient/doctors" className={linkClass('/patient/doctors')}>
              <Users size={14} /> Find Doctors
            </Link>
            <Link to="/patient/appointments" className={linkClass('/patient/appointments')}>
              <CalendarDays size={14} /> My Appointments
            </Link>
          </>}
          {user?.role === 'doctor' && <>
            <Link to="/doctor/appointments" className={linkClass('/doctor/appointments')}>
              <Calendar size={14} /> My Schedule
            </Link>
            <Link to="/doctor/leave" className={linkClass('/doctor/leave')}>
              <CalendarDays size={14} /> Mark Leave
            </Link>
          </>}
          {user?.role === 'admin' && <>
            <Link to="/admin/doctors" className={linkClass('/admin/doctors')}>
              <UserPlus size={14} /> Doctors
            </Link>
          </>}
          {user ? (
            <button onClick={logout}
              className="flex items-center gap-1.5 text-sm font-medium text-blue-100 hover:text-white hover:bg-blue-800 px-3 py-1.5 rounded-md transition-colors ml-2">
              <LogOut size={14} /> Logout
            </button>
          ) : (
            <Link to="/login" className="text-sm font-medium text-blue-100 hover:text-white px-3 py-1.5">Login</Link>
          )}
        </div>
      </div>
    </nav>
  );
}
