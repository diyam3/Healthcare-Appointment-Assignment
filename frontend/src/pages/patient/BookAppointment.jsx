import { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { Calendar, Clock, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../api/axios';
import { PreVisitCard } from '../../components/SummaryCard';

const STEPS = ['Select Slot', 'Describe Symptoms', 'Confirmed'];

export default function BookAppointment() {
  const { doctorId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [date, setDate] = useState(searchParams.get('date') || new Date().toISOString().split('T')[0]);
  const [slots, setSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [holdId, setHoldId] = useState(null);
  const [symptoms, setSymptoms] = useState('');
  const [appointment, setAppointment] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => { fetchSlots(); }, [date]);

  async function fetchSlots() {
    setSlotsLoading(true);
    try {
      const { data } = await api.get(`/appointments/doctors/${doctorId}/slots`, { params: { date } });
      setSlots(data.slots || []);
    } catch { toast.error('Could not load slots.'); }
    finally { setSlotsLoading(false); }
  }

  async function holdSlot(slot) {
    setLoading(true);
    try {
      const { data } = await api.post('/appointments/hold', { doctorId, slotStartTime: slot });
      setHoldId(data.hold.id);
      setSelectedSlot(slot);
      setStep(1);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Slot unavailable — please try another.');
    } finally { setLoading(false); }
  }

  async function confirmAppointment(e) {
    e.preventDefault();
    setLoading(true);
    const toastId = toast.loading('Confirming appointment and generating AI summary…');
    try {
      const { data } = await api.post(`/appointments/${holdId}/confirm`, { symptoms });
      setAppointment(data.appointment);
      setStep(2);
      toast.success('Appointment confirmed!', { id: toastId });
    } catch (err) {
      toast.error(err.response?.data?.error || 'Hold expired — please select a new slot.', { id: toastId });
    } finally { setLoading(false); }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="page-title mb-6">Book Appointment</h1>

      {/* Step indicator */}
      <div className="flex items-center mb-8">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center flex-1">
            <div className={`flex items-center gap-2 text-sm font-medium transition-colors ${
              i === step ? 'text-blue-600' : i < step ? 'text-green-600' : 'text-slate-400'
            }`}>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors ${
                i === step ? 'border-blue-600 bg-blue-600 text-white' :
                i < step  ? 'border-green-500 bg-green-500 text-white' :
                'border-slate-300 text-slate-400'
              }`}>
                {i < step ? '✓' : i + 1}
              </div>
              <span className="hidden sm:block">{s}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`flex-1 h-0.5 mx-3 transition-colors ${i < step ? 'bg-green-400' : 'bg-slate-200'}`} />
            )}
          </div>
        ))}
      </div>

      {/* Step 0 — slot selection */}
      {step === 0 && (
        <div className="card p-6">
          <div className="mb-5">
            <label className="label">Select Date</label>
            <div className="relative w-52">
              <Calendar size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="date" value={date} onChange={e => setDate(e.target.value)} className="input pl-9" />
            </div>
          </div>

          {slotsLoading && (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-10 bg-slate-100 animate-pulse rounded-lg" />
              ))}
            </div>
          )}

          {!slotsLoading && slots.length === 0 && (
            <div className="text-center py-10">
              <Clock size={32} className="text-slate-300 mx-auto mb-2" />
              <p className="text-slate-500 font-medium">No available slots</p>
              <p className="text-slate-400 text-sm">Try a different date (Mon–Fri only)</p>
            </div>
          )}

          {!slotsLoading && slots.length > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {slots.map(slot => (
                <button key={slot} onClick={() => holdSlot(slot)} disabled={loading}
                  className="border border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100
                             py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
                  {new Date(slot).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Step 1 — symptoms */}
      {step === 1 && (
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-4 p-3 bg-blue-50 rounded-lg">
            <Clock size={14} className="text-blue-500 shrink-0" />
            <p className="text-sm text-blue-800">
              <strong>
                {new Date(selectedSlot).toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })}
                {' at '}
                {new Date(selectedSlot).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </strong>
              <span className="text-blue-500 ml-2">· Hold expires in 8 min</span>
            </p>
          </div>
          <form onSubmit={confirmAppointment} className="space-y-4">
            <div>
              <label className="label">Describe your symptoms <span className="text-red-500">*</span></label>
              <p className="text-xs text-slate-500 mb-2">The AI will generate a pre-visit summary for your doctor.</p>
              <textarea required rows={6} value={symptoms} onChange={e => setSymptoms(e.target.value)}
                placeholder="e.g. I've had a persistent headache for 3 days with fever and fatigue…"
                className="input resize-none" />
            </div>
            <button type="submit" disabled={loading || !symptoms.trim()}
              className="btn-primary w-full flex justify-center items-center gap-2 py-2.5">
              {loading
                ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Confirming…</>
                : 'Confirm Appointment'}
            </button>
          </form>
        </div>
      )}

      {/* Step 2 — confirmed */}
      {step === 2 && appointment && (
        <div className="space-y-4">
          <div className="card p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle size={20} className="text-green-600" />
              </div>
              <div>
                <h2 className="font-semibold text-slate-800">Appointment Confirmed</h2>
                <p className="text-sm text-slate-500">A confirmation email has been sent to you</p>
              </div>
            </div>
            <div className="bg-slate-50 rounded-lg p-3 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Date &amp; Time</span>
                <span className="font-medium">{new Date(appointment.slotStartTime).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Doctor</span>
                <span className="font-medium">Dr. {appointment.doctor?.name}</span>
              </div>
            </div>
          </div>

          <PreVisitCard summary={appointment.preVisitSummary} />

          <button onClick={() => navigate('/patient/appointments')}
            className="btn-primary w-full flex justify-center py-2.5">
            View My Appointments
          </button>
        </div>
      )}
    </div>
  );
}
