import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';

const STATUS_COLORS = {
  confirmed: 'bg-green-100 text-green-700',
  completed: 'bg-blue-100 text-blue-700',
  held: 'bg-yellow-100 text-yellow-700',
  cancelled_by_patient: 'bg-red-100 text-red-700',
  cancelled_by_leave: 'bg-orange-100 text-orange-700',
};

export default function PatientAppointments() {
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/appointments/my').then(r => setAppointments(r.data)).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-gray-500">Loading…</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6 text-gray-800">My Appointments</h1>
      {appointments.length === 0 && <p className="text-gray-500">No appointments yet. <a href="/patient/doctors" className="text-blue-600 hover:underline">Book one</a>.</p>}
      <div className="space-y-3">
        {appointments.map(appt => (
          <div key={appt.id} className="bg-white rounded shadow p-4 flex justify-between items-center cursor-pointer hover:shadow-md"
            onClick={() => navigate(`/patient/appointments/${appt.id}`)}>
            <div>
              <p className="font-medium text-gray-800">Dr. {appt.doctor?.name}</p>
              <p className="text-sm text-gray-500">{new Date(appt.slotStartTime).toLocaleString()}</p>
              <p className="text-sm text-blue-600">{appt.doctor?.specialization}</p>
            </div>
            <span className={`text-xs px-2 py-1 rounded font-medium ${STATUS_COLORS[appt.status] || 'bg-gray-100 text-gray-600'}`}>
              {appt.status.replace(/_/g, ' ')}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
