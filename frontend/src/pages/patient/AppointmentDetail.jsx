import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Clock, Activity, Pill } from 'lucide-react';
import api from '../../api/axios';
import { SkeletonList } from '../../components/Skeleton';
import { PreVisitCard, PostVisitCard } from '../../components/SummaryCard';

const STATUS_CONFIG = {
  confirmed:            { bg: 'bg-green-100',  text: 'text-green-700',  label: 'Confirmed'          },
  completed:            { bg: 'bg-blue-100',   text: 'text-blue-700',   label: 'Completed'          },
  held:                 { bg: 'bg-amber-100',  text: 'text-amber-700',  label: 'Pending'            },
  cancelled_by_patient: { bg: 'bg-red-100',    text: 'text-red-700',    label: 'Cancelled'          },
  cancelled_by_leave:   { bg: 'bg-orange-100', text: 'text-orange-700', label: 'Cancelled by Leave' },
};

export default function AppointmentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [appt, setAppt] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/appointments/${id}/summary`)
      .then(r => setAppt(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <div className="max-w-2xl mx-auto space-y-4">
      <SkeletonList count={3} />
    </div>
  );

  if (!appt) return (
    <div className="max-w-2xl mx-auto card p-10 text-center">
      <p className="text-slate-500">Appointment not found.</p>
    </div>
  );

  const cfg = STATUS_CONFIG[appt.status] || { bg: 'bg-slate-100', text: 'text-slate-600', label: appt.status };

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <button onClick={() => navigate('/patient/appointments')}
        className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors">
        <ArrowLeft size={15} /> Back to Appointments
      </button>

      <h1 className="page-title">Appointment Detail</h1>

      {/* Summary card */}
      <div className="card p-5 space-y-3">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
              <User size={16} className="text-blue-600" />
            </div>
            <div>
              <p className="font-semibold text-slate-800">Dr. {appt.doctor?.name}</p>
              <p className="text-sm text-blue-600">{appt.doctor?.specialization}</p>
            </div>
          </div>
          <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${cfg.bg} ${cfg.text}`}>{cfg.label}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-600 pt-1 border-t border-slate-100">
          <Clock size={13} className="text-slate-400" />
          {new Date(appt.slotStartTime).toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          {' at '}
          {new Date(appt.slotStartTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>

      <PreVisitCard summary={appt.preVisitSummary} />
      <PostVisitCard summary={appt.postVisitSummary} />

      {appt.prescriptions?.length > 0 && (
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-3">
            <Pill size={15} className="text-slate-500" />
            <p className="section-title">Prescriptions</p>
          </div>
          <ul className="space-y-2">
            {appt.prescriptions.map(rx => (
              <li key={rx.id} className="flex items-start gap-2 text-sm bg-slate-50 rounded-lg px-3 py-2">
                <Activity size={13} className="text-slate-400 mt-0.5 shrink-0" />
                <span>
                  <span className="font-medium text-slate-800">{rx.drugName}</span>
                  <span className="text-slate-500"> — {rx.dosage}, {rx.frequency}, {rx.durationDays} day{rx.durationDays !== 1 ? 's' : ''}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
