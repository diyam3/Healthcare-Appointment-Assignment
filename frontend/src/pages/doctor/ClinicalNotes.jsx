import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../api/axios';

export default function ClinicalNotes() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [appt, setAppt] = useState(null);
  const [notes, setNotes] = useState('');
  const [prescriptions, setPrescriptions] = useState([{ drugName: '', dosage: '', frequency: '', durationDays: 1 }]);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get(`/appointments/${id}/summary`).then(r => setAppt(r.data)).catch(console.error);
  }, [id]);

  function addRx() { setPrescriptions(p => [...p, { drugName: '', dosage: '', frequency: '', durationDays: 1 }]); }
  function updateRx(i, field, val) { setPrescriptions(p => p.map((rx, idx) => idx === i ? { ...rx, [field]: val } : rx)); }
  function removeRx(i) { setPrescriptions(p => p.filter((_, idx) => idx !== i)); }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const { data } = await api.post(`/appointments/${id}/notes`, { clinicalNotes: notes, prescription: prescriptions.filter(rx => rx.drugName) });
      setResult(data.postVisitSummary);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit notes');
    } finally { setLoading(false); }
  }

  if (!appt) return <p className="text-gray-500">Loading…</p>;

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold text-gray-800">Clinical Notes</h1>
      <div className="bg-white rounded shadow p-4 text-sm text-gray-700">
        <p><strong>Patient:</strong> {appt.patient?.name}</p>
        <p><strong>Time:</strong> {new Date(appt.slotStartTime).toLocaleString()}</p>
        {appt.preVisitSummary && appt.preVisitSummary.status !== 'llm_failed' && (
          <div className="mt-2 bg-blue-50 p-3 rounded">
            <p className="font-medium text-blue-800">Pre-Visit Summary</p>
            <p>{appt.preVisitSummary.chief_complaint}</p>
            <p className="text-xs mt-1">Urgency: <strong>{appt.preVisitSummary.urgency_level}</strong></p>
          </div>
        )}
      </div>

      {result ? (
        <div className="bg-green-50 border border-green-200 p-5 rounded">
          <p className="font-semibold text-green-800 mb-2">Post-Visit Summary Generated</p>
          {result.status === 'llm_failed'
            ? <p className="text-yellow-700 text-sm">AI summary unavailable — notes saved.</p>
            : <>
                <p className="text-sm text-green-900">{result.summary_text}</p>
                <button onClick={() => navigate('/doctor/appointments')} className="mt-4 bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700">Back to Schedule</button>
              </>
          }
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="bg-white rounded shadow p-6 space-y-4">
          {error && <div className="bg-red-50 text-red-700 border border-red-200 rounded p-3 text-sm">{error}</div>}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Clinical Notes</label>
            <textarea required rows={6} value={notes} onChange={e => setNotes(e.target.value)}
              className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400" />
          </div>
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-medium text-gray-700">Prescriptions</label>
              <button type="button" onClick={addRx} className="text-blue-600 text-sm hover:underline">+ Add</button>
            </div>
            {prescriptions.map((rx, i) => (
              <div key={i} className="grid grid-cols-4 gap-2 mb-2 text-sm">
                {[['Drug', 'drugName'], ['Dosage', 'dosage'], ['Frequency', 'frequency']].map(([ph, field]) => (
                  <input key={field} placeholder={ph} value={rx[field]} onChange={e => updateRx(i, field, e.target.value)}
                    className="border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400" />
                ))}
                <div className="flex gap-1">
                  <input type="number" placeholder="Days" min={1} value={rx.durationDays} onChange={e => updateRx(i, 'durationDays', e.target.value)}
                    className="border rounded px-2 py-1 w-16 focus:outline-none focus:ring-1 focus:ring-blue-400" />
                  <button type="button" onClick={() => removeRx(i)} className="text-red-400 hover:text-red-600 text-lg leading-none">×</button>
                </div>
              </div>
            ))}
          </div>
          <button type="submit" disabled={loading}
            className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50">
            {loading ? 'Submitting…' : 'Submit Notes'}
          </button>
        </form>
      )}
    </div>
  );
}
