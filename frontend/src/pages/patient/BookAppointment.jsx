import { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import api from '../../api/axios';

const STEPS = ['Select Slot', 'Describe Symptoms', 'Confirmation'];

export default function BookAppointment() {
  const { doctorId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [date, setDate] = useState(searchParams.get('date') || new Date().toISOString().split('T')[0]);
  const [slots, setSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [holdId, setHoldId] = useState(null);
  const [symptoms, setSymptoms] = useState('');
  const [appointment, setAppointment] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { fetchSlots(); }, [date]);

  async function fetchSlots() {
    try {
      const { data } = await api.get(`/appointments/doctors/${doctorId}/slots`, { params: { date } });
      setSlots(data.slots || []);
    } catch (err) { console.error(err); }
  }

  async function holdSlot(slot) {
    setLoading(true); setError('');
    try {
      const { data } = await api.post('/appointments/hold', { doctorId, slotStartTime: slot });
      setHoldId(data.hold.id);
      setSelectedSlot(slot);
      setStep(1);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not hold this slot. Please try another.');
    } finally { setLoading(false); }
  }

  async function confirmAppointment(e) {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const { data } = await api.post(`/appointments/${holdId}/confirm`, { symptoms });
      setAppointment(data.appointment);
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to confirm. The hold may have expired.');
    } finally { setLoading(false); }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4 text-gray-800">Book Appointment</h1>
      {/* Step indicator */}
      <div className="flex gap-2 mb-6">
        {STEPS.map((s, i) => (
          <div key={s} className={`flex-1 text-center py-2 rounded text-sm font-medium ${i === step ? 'bg-blue-600 text-white' : i < step ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{s}</div>
        ))}
      </div>

      {error && <div className="bg-red-50 text-red-700 border border-red-200 rounded p-3 mb-4 text-sm">{error}</div>}

      {step === 0 && (
        <div className="bg-white rounded shadow p-6">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Select Date</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              className="border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400" />
          </div>
          {slots.length === 0 ? <p className="text-gray-500">No available slots for this date.</p> : (
            <div className="grid grid-cols-3 gap-2">
              {slots.map(slot => (
                <button key={slot} onClick={() => holdSlot(slot)} disabled={loading}
                  className="border border-blue-300 text-blue-700 py-2 rounded hover:bg-blue-50 disabled:opacity-50 text-sm">
                  {new Date(slot).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {step === 1 && (
        <div className="bg-white rounded shadow p-6">
          <p className="text-sm text-gray-600 mb-4">
            Slot: <strong>{new Date(selectedSlot).toLocaleString()}</strong>
          </p>
          <form onSubmit={confirmAppointment} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Describe your symptoms</label>
              <textarea required rows={5} value={symptoms} onChange={e => setSymptoms(e.target.value)}
                placeholder="Please describe your symptoms in detail…"
                className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400" />
            </div>
            <button type="submit" disabled={loading}
              className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50">
              {loading ? 'Confirming…' : 'Confirm Appointment'}
            </button>
          </form>
        </div>
      )}

      {step === 2 && appointment && (
        <div className="bg-white rounded shadow p-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-green-600 text-2xl">✓</span>
            <h2 className="text-lg font-semibold text-gray-800">Appointment Confirmed!</h2>
          </div>
          <p className="text-sm text-gray-600 mb-2">Appointment ID: <code className="bg-gray-100 px-1 rounded">{appointment.id}</code></p>
          <p className="text-sm text-gray-600 mb-4">Time: <strong>{new Date(appointment.slotStartTime).toLocaleString()}</strong></p>

          {/* Pre-visit summary */}
          {appointment.preVisitSummary && (
            appointment.preVisitSummary.status === 'llm_failed'
              ? <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-4 rounded text-sm">
                  <strong>AI summary unavailable</strong> — showing raw symptoms.<br/>
                  <p className="mt-1 whitespace-pre-wrap">{appointment.preVisitSummary.raw}</p>
                </div>
              : <div className="bg-blue-50 border border-blue-200 p-4 rounded">
                  <p className="font-semibold text-blue-800 mb-2">Pre-Visit Summary</p>
                  <p className="text-sm"><span className={`inline-block px-2 py-0.5 rounded text-white text-xs font-bold mr-2 ${appointment.preVisitSummary.urgency_level === 'High' ? 'bg-red-500' : appointment.preVisitSummary.urgency_level === 'Medium' ? 'bg-yellow-500' : 'bg-green-500'}`}>{appointment.preVisitSummary.urgency_level} Urgency</span></p>
                  <p className="text-sm mt-2 text-blue-900"><strong>Chief Complaint:</strong> {appointment.preVisitSummary.chief_complaint}</p>
                  <ul className="text-sm mt-2 list-disc list-inside text-blue-900">
                    {appointment.preVisitSummary.suggested_questions?.map((q, i) => <li key={i}>{q}</li>)}
                  </ul>
                </div>
          )}
          <button onClick={() => navigate('/patient/appointments')}
            className="mt-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm">
            View My Appointments
          </button>
        </div>
      )}
    </div>
  );
}
