import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Clock, Stethoscope, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../api/axios';
import { SkeletonList } from '../../components/Skeleton';

export default function DoctorSearch() {
  const navigate = useNavigate();
  const [spec, setSpec] = useState('');
  const [date, setDate] = useState('');
  const [doctors, setDoctors] = useState([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);

  async function search(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const params = {};
      if (spec) params.specialization = spec;
      if (date) params.date = date;
      const { data } = await api.get('/doctors', { params });
      setDoctors(data);
      setSearched(true);
    } catch {
      toast.error('Search failed. Please try again.');
    } finally { setLoading(false); }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="page-title">Find a Doctor</h1>
        <p className="text-slate-500 text-sm mt-1">Search by specialization and availability</p>
      </div>

      <form onSubmit={search} className="card p-6 mb-6">
        <div className="flex flex-col sm:flex-row gap-4 items-end">
          <div className="flex-1">
            <label className="label">Specialization</label>
            <div className="relative">
              <Stethoscope size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={spec} onChange={e => setSpec(e.target.value)}
                placeholder="e.g. Cardiology, General Practice…"
                className="input pl-9" />
            </div>
          </div>
          <div className="flex-1">
            <label className="label">Available on date</label>
            <div className="relative">
              <Calendar size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="date" value={date} onChange={e => setDate(e.target.value)} className="input pl-9" />
            </div>
          </div>
          <button type="submit" disabled={loading}
            className="btn-primary flex items-center gap-2 whitespace-nowrap">
            {loading
              ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Searching…</>
              : <><Search size={15} /> Search</>}
          </button>
        </div>
      </form>

      {loading && <SkeletonList count={3} />}

      {!loading && searched && doctors.length === 0 && (
        <div className="card p-10 text-center">
          <Stethoscope size={36} className="text-slate-300 mx-auto mb-3" />
          <p className="font-medium text-slate-600">No doctors found</p>
          <p className="text-sm text-slate-400 mt-1">Try a different specialization or date</p>
        </div>
      )}

      {!loading && (
        <div className="grid gap-4 sm:grid-cols-2">
          {doctors.map(doc => (
            <div key={doc.id} className="card p-5 flex justify-between items-start hover:shadow-md transition-shadow">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                  <Stethoscope size={16} className="text-blue-600" />
                </div>
                <div>
                  <p className="font-semibold text-slate-800">Dr. {doc.name}</p>
                  <p className="text-sm text-blue-600 font-medium">{doc.specialization}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <Clock size={12} className="text-slate-400" />
                    <p className="text-xs text-slate-500">{doc.slotDurationMin} min slots</p>
                  </div>
                </div>
              </div>
              <button onClick={() => navigate(`/patient/book/${doc.id}${date ? `?date=${date}` : ''}`)}
                className="btn-primary text-sm py-1.5 px-3">
                Book
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
