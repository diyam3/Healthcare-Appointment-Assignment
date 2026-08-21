import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';

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
    } catch (err) {
      console.error(err);
    } finally { setLoading(false); }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6 text-gray-800">Find a Doctor</h1>
      <form onSubmit={search} className="bg-white p-6 rounded shadow flex flex-wrap gap-4 mb-6 items-end">
        <div className="flex-1 min-w-48">
          <label className="block text-sm font-medium text-gray-700 mb-1">Specialization</label>
          <input value={spec} onChange={e => setSpec(e.target.value)} placeholder="e.g. Cardiology"
            className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400" />
        </div>
        <div className="flex-1 min-w-48">
          <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400" />
        </div>
        <button type="submit" disabled={loading}
          className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50">
          {loading ? 'Searching…' : 'Search'}
        </button>
      </form>

      {searched && doctors.length === 0 && <p className="text-gray-500">No doctors found for your criteria.</p>}
      <div className="grid gap-4 md:grid-cols-2">
        {doctors.map(doc => (
          <div key={doc.id} className="bg-white rounded shadow p-5 flex justify-between items-start">
            <div>
              <p className="font-semibold text-gray-800">Dr. {doc.name}</p>
              <p className="text-sm text-blue-600">{doc.specialization}</p>
              <p className="text-sm text-gray-500">{doc.slotDurationMin} min slots</p>
            </div>
            <button onClick={() => navigate(`/patient/book/${doc.id}${date ? `?date=${date}` : ''}`)}
              className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700">Book</button>
          </div>
        ))}
      </div>
    </div>
  );
}
