import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { CalendarDays, ChevronRight, Stethoscope } from 'lucide-react';
import api from '../../api/axios';
import { SkeletonList } from '../../components/Skeleton';

const STATUS_CONFIG = {
  confirmed:           { bg: 'bg-green-100',  text: 'text-green-700',  label: 'Confirmed'           },
  completed:           { bg: 'bg-blue-100',   text: 'text-blue-700',   label: 'Completed'           },
  held:                { bg: 'bg-amber-100',  text: 'text-amber-700',  label: 'Pending'             },
  cancelled_by_patient:{ bg: 'bg-red-100',    text: 'text-red-700',    label: 'Cancelled'           },
  cancelled_by_leave:  { bg: 'bg-orange-100', text: 'text-orange-700', label: 'Cancelled by Leave'  },
};

export default function PatientAppointments() {
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/appointments/my')
      .then(r => setAppointments(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="mb-6">
        <h1 className="page-title">My Appointments</h1>
        <p className="text-slate-500 text-sm mt-1">View and manage your upcoming and past visits</p>
      </div>

      {loading && <SkeletonList count={4} />}

      {!loading && appointments.length === 0 && (
        <div className="card p-12 text-center">
          <CalendarDays size={40} className="text-slate-300 mx-auto mb-3" />
          <p className="font-medium text-slate-600">No appointments yet</p>
          <p className="text-sm text-slate-400 mt-1 mb-4">Book your first appointment with a doctor</p>
          <Link to="/patient/doctors" className="btn-primary inline-flex items-center gap-2">
            <Stethoscope size={15} /> Find a Doctor
          </Link>
        </div>
      )}

      {!loading && appointments.length > 0 && (
        <div className="space-y-3">
          {appointments.map(appt => {
            const cfg = STATUS_CONFIG[appt.status] || { bg: 'bg-slate-100', text: 'text-slate-600', label: appt.status };
            return (
              <div key={appt.id}
                className="card p-4 flex items-center justify-between cursor-pointer hover:shadow-md transition-shadow group"
                onClick={() => navigate(`/patient/appointments/${appt.id}`)}>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                    <Stethoscope size={16} className="text-blue-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800">Dr. {appt.doctor?.name}</p>
                    <p className="text-sm text-slate-500">
                      {new Date(appt.slotStartTime).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
                      {' · '}
                      {new Date(appt.slotStartTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    <p className="text-xs text-blue-600 font-medium mt-0.5">{appt.doctor?.specialization}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${cfg.bg} ${cfg.text}`}>
                    {cfg.label}
                  </span>
                  <ChevronRight size={16} className="text-slate-300 group-hover:text-slate-500 transition-colors" />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
