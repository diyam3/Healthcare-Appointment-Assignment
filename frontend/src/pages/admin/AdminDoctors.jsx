import { useState, useEffect } from 'react';
import api from '../../api/axios';

const defaultForm = { name: '', email: '', password: '', specialization: '', slotDurationMin: 30, workingHours: '{"monday":{"start":"09:00","end":"17:00"},"tuesday":{"start":"09:00","end":"17:00"},"wednesday":{"start":"09:00","end":"17:00"},"thursday":{"start":"09:00","end":"17:00"},"friday":{"start":"09:00","end":"17:00"}}' };

export default function AdminDoctors() {
  const [doctors, setDoctors] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(defaultForm);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => { loadDoctors(); }, []);
  async function loadDoctors() {
    try { const { data } = await api.get('/admin/doctors'); setDoctors(data); } catch (e) { console.error(e); }
  }

  function openCreate() { setEditing(null); setForm(defaultForm); setError(''); setShowModal(true); }
  function openEdit(doc) {
    setEditing(doc);
    setForm({ name: doc.name, email: doc.user?.email || '', password: '', specialization: doc.specialization, slotDurationMin: doc.slotDurationMin, workingHours: JSON.stringify(doc.workingHours) });
    setError(''); setShowModal(true);
  }

  async function handleSubmit(e) {
    e.preventDefault(); setLoading(true); setError('');
    try {
      let wh;
      try { wh = JSON.parse(form.workingHours); } catch { setError('Working hours must be valid JSON'); setLoading(false); return; }
      const payload = { ...form, workingHours: wh, slotDurationMin: Number(form.slotDurationMin) };
      if (editing) {
        await api.put(`/admin/doctors/${editing.id}`, payload);
      } else {
        await api.post('/admin/doctors', payload);
      }
      setShowModal(false); await loadDoctors();
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.errors?.[0]?.msg || 'Operation failed');
    } finally { setLoading(false); }
  }

  async function handleDelete(id) {
    if (!window.confirm('Deactivate this doctor?')) return;
    try { await api.delete(`/admin/doctors/${id}`); await loadDoctors(); } catch (e) { console.error(e); }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Manage Doctors</h1>
        <button onClick={openCreate} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm">+ Add Doctor</button>
      </div>

      <div className="bg-white rounded shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>{['Name', 'Specialization', 'Slot (min)', 'Active', 'Actions'].map(h => <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y">
            {doctors.map(doc => (
              <tr key={doc.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">{doc.name}</td>
                <td className="px-4 py-3 text-blue-600">{doc.specialization}</td>
                <td className="px-4 py-3">{doc.slotDurationMin}</td>
                <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-xs font-medium ${doc.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{doc.isActive ? 'Active' : 'Inactive'}</span></td>
                <td className="px-4 py-3 flex gap-2">
                  <button onClick={() => openEdit(doc)} className="text-blue-600 hover:underline">Edit</button>
                  <button onClick={() => handleDelete(doc.id)} className="text-red-500 hover:underline">Deactivate</button>
                  <a href={`/admin/doctors/${doc.id}/leave`} className="text-gray-500 hover:underline">Leave</a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold mb-4">{editing ? 'Edit Doctor' : 'Add Doctor'}</h2>
            {error && <div className="bg-red-50 text-red-700 border border-red-200 rounded p-3 mb-4 text-sm">{error}</div>}
            <form onSubmit={handleSubmit} className="space-y-3">
              {[['Name', 'text', 'name'], ['Email', 'email', 'email'], ...(editing ? [] : [['Password', 'password', 'password']]), ['Specialization', 'text', 'specialization']].map(([label, type, key]) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                  <input type={type} required={!editing || key !== 'password'} value={form[key] || ''} onChange={e => setForm(f => ({...f, [key]: e.target.value}))}
                    className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm" />
                </div>
              ))}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Slot Duration (min)</label>
                <input type="number" min={5} max={120} required value={form.slotDurationMin} onChange={e => setForm(f => ({...f, slotDurationMin: e.target.value}))}
                  className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Working Hours (JSON)</label>
                <textarea rows={4} value={form.workingHours} onChange={e => setForm(f => ({...f, workingHours: e.target.value}))}
                  className="w-full border rounded px-3 py-2 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-blue-400" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={loading}
                  className="flex-1 bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50 text-sm">
                  {loading ? 'Saving…' : editing ? 'Update' : 'Create'}
                </button>
                <button type="button" onClick={() => setShowModal(false)}
                  className="flex-1 border border-gray-300 text-gray-700 py-2 rounded hover:bg-gray-50 text-sm">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
