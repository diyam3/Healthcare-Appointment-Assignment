import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarDays, User, ClipboardList } from 'lucide-react';
import api from '../../api/axios';
import { SkeletonList } from '../../components/Skeleton';
import UrgencyBadge from '../../components/UrgencyBadge';

export default function DoctorSchedule() {
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/appointments/doctor/mine')
      .then(r => setAppointments(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="mb-6">
        <h1 className="page-title">My Schedule</h1>
        <p className="text-slate-500 text-sm mt-1">Upcoming and recent patient appointments</p>
      </div>

      {loading && <SkeletonList count={4} />}

      {!loading && appointments.length === 0 && (
        <div className="card p-12 text-center">
          <CalendarDays size={40} className="text-slate-300 mx-auto mb-3" />
          <p className="font-medium text-slate-600">No upcoming appointments</p>
          <p className="text-sm text-slate-400 mt-1">Patients will appear here when they book a slot</p>
        </div>
      )}

      {!loading && appointments.length > 0 && (
        <div className="space-y-3">
          {appointments.map(appt => {
            const urgency = appt.preVisitSummary?.urgency_level;
            return (
              <div key={appt.id}
                className={`card p-4 flex items-start justify-between border-l-4 ${
                  urgency === 'High'   ? 'border-red-500' :
                  urgency === 'Medium' ? 'border-amber-400' : 'border-emerald-400'
                }`}>
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                    <User size={15} className="text-slate-500" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-0.5">
                      <p className="font-semibold text-slate-800">{appt.patient?.name}</p>
                      {urgency && <UrgencyBadge level={urgency} />}
                    </div>
                    <p className="text-sm text-slate-500">
                      {new Date(appt.slotStartTime).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
                      {' · '}
                      {new Date(appt.slotStartTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    {appt.preVisitSummary?.chief_complaint && (
                      <p className="text-sm text-slate-600 mt-1 truncate">{appt.preVisitSummary.chief_complaint}</p>
                    )}
                  </div>
                </div>
                {appt.status === 'confirmed' && (
                  <button onClick={() => navigate(`/doctor/appointments/${appt.id}/notes`)}
                    className="btn-primary flex items-center gap-1.5 text-sm py-1.5 px-3 ml-3 shrink-0">
                    <ClipboardList size={13} /> Add Notes
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
