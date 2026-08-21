import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';

export default function DoctorSchedule() {
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/appointments/doctor/mine').then(r => setAppointments(r.data)).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-gray-500">Loading…</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6 text-gray-800">My Schedule</h1>
      {appointments.length === 0 && <p className="text-gray-500">No upcoming appointments.</p>}
      <div className="space-y-3">
        {appointments.map(appt => {
          const urgency = appt.preVisitSummary?.urgency_level;
          return (
            <div key={appt.id} className={`bg-white rounded shadow p-4 flex justify-between items-start border-l-4 ${urgency === 'High' ? 'border-red-500' : urgency === 'Medium' ? 'border-yellow-400' : 'border-green-400'}`}>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-medium text-gray-800">{appt.patient?.name}</p>
                  {urgency === 'High' && <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded font-bold">HIGH URGENCY</span>}
                </div>
                <p className="text-sm text-gray-500">{new Date(appt.slotStartTime).toLocaleString()}</p>
                {appt.preVisitSummary?.chief_complaint && <p className="text-sm text-gray-600 mt-1">{appt.preVisitSummary.chief_complaint}</p>}
              </div>
              {appt.status === 'confirmed' && (
                <button onClick={() => navigate(`/doctor/appointments/${appt.id}/notes`)}
                  className="bg-blue-600 text-white px-3 py-1.5 rounded text-sm hover:bg-blue-700">
                  Add Notes
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
