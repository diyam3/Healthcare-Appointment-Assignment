import { useState } from 'react';
import { CalendarOff } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../api/axios';

export default function DoctorLeave() {
  const [leaveDate, setLeaveDate] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const { data: doctorData } = await api.get('/doctors/my');
      const { data } = await api.post(`/doctors/${doctorData.id}/leave`, { leaveDate, reason });
      toast.success(`Leave marked. ${data.cancelledAppointments} appointment(s) cancelled and patients notified.`);
      setLeaveDate('');
      setReason('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to mark leave');
    } finally { setLoading(false); }
  }

  return (
    <div className="max-w-md mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
          <CalendarOff size={18} className="text-amber-600" />
        </div>
        <div>
          <h1 className="page-title">Mark Leave Day</h1>
          <p className="text-slate-500 text-sm">Patients with confirmed slots will be notified</p>
        </div>
      </div>

      <div className="card p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Leave Date <span className="text-red-500">*</span></label>
            <input type="date" required value={leaveDate} onChange={e => setLeaveDate(e.target.value)} className="input" />
          </div>
          <div>
            <label className="label">Reason <span className="text-slate-400 font-normal">(optional)</span></label>
            <input value={reason} onChange={e => setReason(e.target.value)}
              placeholder="e.g. Personal leave, Medical conference…" className="input" />
          </div>
          <button type="submit" disabled={loading || !leaveDate}
            className="btn-primary w-full flex justify-center items-center gap-2 py-2.5">
            {loading
              ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Marking…</>
              : 'Mark Leave'}
          </button>
        </form>
      </div>
    </div>
  );
}
