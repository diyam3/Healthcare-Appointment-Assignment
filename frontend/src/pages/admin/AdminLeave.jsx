import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../api/axios';

export default function AdminLeave() {
  const { id: doctorId } = useParams();
  const navigate = useNavigate();
  const [leaveDate, setLeaveDate] = useState('');
  const [reason, setReason] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault(); setLoading(true); setError(''); setResult(null);
    try {
      const { data } = await api.post(`/doctors/${doctorId}/leave`, { leaveDate, reason });
      setResult(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to mark leave');
    } finally { setLoading(false); }
  }

  return (
    <div className="max-w-md mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/admin/doctors')} className="text-blue-600 hover:underline text-sm">← Back</button>
        <h1 className="text-2xl font-bold text-gray-800">Mark Doctor Leave</h1>
      </div>
      {result && <div className="bg-green-50 border border-green-200 text-green-800 p-4 rounded mb-4 text-sm">
        Leave marked. {result.cancelledAppointments} appointment(s) cancelled.
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
          <input value={reason} onChange={e => setReason(e.target.value)}
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
