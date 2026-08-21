import { Link, useNavigate } from 'react-router-dom';
import { getUser, clearAuth } from '../utils/auth';

export default function Navbar() {
  const navigate = useNavigate();
  const user = getUser();

  function logout() { clearAuth(); navigate('/login'); }

  return (
    <nav className="bg-blue-700 text-white px-6 py-3 flex items-center justify-between">
      <Link to="/" className="font-bold text-lg">HealthCare</Link>
      <div className="flex gap-4 items-center text-sm">
        {user?.role === 'patient' && <>
          <Link to="/patient/doctors" className="hover:underline">Find Doctors</Link>
          <Link to="/patient/appointments" className="hover:underline">My Appointments</Link>
        </>}
        {user?.role === 'doctor' && <>
          <Link to="/doctor/appointments" className="hover:underline">My Schedule</Link>
          <Link to="/doctor/leave" className="hover:underline">Mark Leave</Link>
        </>}
        {user?.role === 'admin' && <>
          <Link to="/admin/doctors" className="hover:underline">Doctors</Link>
        </>}
        {user ? (
          <button onClick={logout} className="bg-white text-blue-700 px-3 py-1 rounded hover:bg-blue-50">Logout</button>
        ) : (
          <Link to="/login" className="hover:underline">Login</Link>
        )}
      </div>
    </nav>
  );
}
