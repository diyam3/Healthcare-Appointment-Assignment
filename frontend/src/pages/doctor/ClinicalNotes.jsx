import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, X, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../api/axios';
import { SkeletonList } from '../../components/Skeleton';
import UrgencyBadge from '../../components/UrgencyBadge';
import { PostVisitCard } from '../../components/SummaryCard';

export default function ClinicalNotes() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [appt, setAppt] = useState(null);
  const [notes, setNotes] = useState('');
  const [prescriptions, setPrescriptions] = useState([{ drugName: '', dosage: '', frequency: '', durationDays: 1 }]);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get(`/appointments/${id}/summary`).then(r => setAppt(r.data)).catch(console.error);
  }, [id]);

  function addRx() { setPrescriptions(p => [...p, { drugName: '', dosage: '', frequency: '', durationDays: 1 }]); }
  function updateRx(i, field, val) { setPrescriptions(p => p.map((rx, idx) => idx === i ? { ...rx, [field]: val } : rx)); }
  function removeRx(i) { setPrescriptions(p => p.filter((_, idx) => idx !== i)); }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    const toastId = toast.loading('Submitting notes and generating post-visit summary…');
    try {
      const { data } = await api.post(`/appointments/${id}/notes`, {
        clinicalNotes: notes,
        prescription: prescriptions.filter(rx => rx.drugName.trim()),
      });
      setResult(data.postVisitSummary);
      toast.success('Notes submitted successfully!', { id: toastId });
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to submit notes', { id: toastId });
    } finally { setLoading(false); }
  }

  if (!appt) return (
    <div className="max-w-2xl mx-auto">
      <SkeletonList count={3} />
    </div>
  );

  const pre = appt.preVisitSummary;

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <button onClick={() => navigate('/doctor/appointments')}
        className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors">
        <ArrowLeft size={15} /> Back to Schedule
      </button>

      <h1 className="page-title">Clinical Notes</h1>

      {/* Patient info + pre-visit summary */}
      <div className="card p-5 space-y-3">
        <div className="flex justify-between items-start">
          <div>
            <p className="font-semibold text-slate-800">{appt.patient?.name}</p>
            <p className="text-sm text-slate-500">
              {new Date(appt.slotStartTime).toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}
              {' at '}
              {new Date(appt.slotStartTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
          {pre && pre.status !== 'llm_failed' && pre.urgency_level && (
            <UrgencyBadge level={pre.urgency_level} size="lg" />
          )}
        </div>
        {pre && pre.status !== 'llm_failed' && pre.chief_complaint && (
          <div className="pt-2 border-t border-slate-100">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1">Chief Complaint</p>
            <p className="text-sm text-slate-700">{pre.chief_complaint}</p>
          </div>
        )}
        {pre && pre.status !== 'llm_failed' && pre.suggested_questions?.length > 0 && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1">Suggested Questions</p>
            <ul className="space-y-1">
              {pre.suggested_questions.map((q, i) => (
                <li key={i} className="text-sm text-slate-600 flex gap-1.5">
                  <span className="text-blue-400">›</span> {q}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {result ? (
        <div className="space-y-4">
          <div className="card p-4 flex items-center gap-3 bg-green-50 border-green-200">
            <CheckCircle size={18} className="text-green-600 shrink-0" />
            <p className="text-sm font-medium text-green-800">Notes saved and post-visit summary generated</p>
          </div>
          <PostVisitCard summary={result} />
          <button onClick={() => navigate('/doctor/appointments')} className="btn-primary w-full flex justify-center py-2.5">
            Back to Schedule
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="card p-6 space-y-5">
          <div>
            <label className="label">Clinical Notes <span className="text-red-500">*</span></label>
            <textarea required rows={7} value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="Document your clinical findings, diagnosis, and treatment plan…"
              className="input resize-none" />
          </div>

          <div>
            <div className="flex justify-between items-center mb-3">
              <label className="label mb-0">Prescriptions</label>
              <button type="button" onClick={addRx}
                className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium">
                <Plus size={14} /> Add medication
              </button>
            </div>
            <div className="space-y-2">
              {prescriptions.map((rx, i) => (
                <div key={i} className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 bg-slate-50 rounded-lg">
                  <input placeholder="Drug name" value={rx.drugName} onChange={e => updateRx(i, 'drugName', e.target.value)}
                    className="input text-sm col-span-2 sm:col-span-1" />
                  <input placeholder="Dosage" value={rx.dosage} onChange={e => updateRx(i, 'dosage', e.target.value)}
                    className="input text-sm" />
                  <input placeholder="Frequency" value={rx.frequency} onChange={e => updateRx(i, 'frequency', e.target.value)}
                    className="input text-sm" />
                  <div className="flex gap-2">
                    <input type="number" placeholder="Days" min={1} value={rx.durationDays}
                      onChange={e => updateRx(i, 'durationDays', e.target.value)}
                      className="input text-sm flex-1" />
                    {prescriptions.length > 1 && (
                      <button type="button" onClick={() => removeRx(i)}
                        className="w-9 h-9 flex items-center justify-center text-slate-400 hover:text-red-500 transition-colors">
                        <X size={15} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button type="submit" disabled={loading || !notes.trim()}
            className="btn-primary w-full flex justify-center items-center gap-2 py-2.5">
            {loading
              ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Submitting…</>
              : 'Submit Notes'}
          </button>
        </form>
      )}
    </div>
  );
}
