import { useState } from 'react';
import api from '../../api/axios';
import { getUser } from '../../utils/auth';

export default function DoctorLeave() {
  const user = getUser();
  const [leaveDate, setLeaveDate] = useState('');
  const [reason, setReason] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true); setError(''); setResult(null);
    try {
      // We need the doctor ID; fetch it from the API
      const { data: doctorData } = await api.get('/doctors/my');
      const { data } = await api.post(`/doctors/${doctorData.id}/leave`, { leaveDate, reason });
      setResult(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to mark leave');
    } finally { setLoading(false); }
  }

  return (
    <div className="max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-6 text-gray-800">Mark Leave Day</h1>
      {result && <div className="bg-green-50 border border-green-200 text-green-800 p-4 rounded mb-4 text-sm">
        Leave marked. {result.cancelledAppointments} appointment(s) cancelled and patients notified.
      </div>}
      {error && <div className="bg-red-50 text-red-700 border border-red-200 rounded p-3 mb-4 text-sm">{error}</div>}
      <form onSubmit={handleSubmit} className="bg-white rounded shadow p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Leave Date</label>
          <input type="date" required value={leaveDate} onChange={e => setLeaveDate(e.target.value)}
            className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Reason (optional)</label>
          <input value={reason} onChange={e => setReason(e.target.value)} placeholder="e.g. Personal leave"
            className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400" />
        </div>
        <button type="submit" disabled={loading}
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50">
          {loading ? 'Marking…' : 'Mark Leave'}
        </button>
      </form>
    </div>
  );
}
