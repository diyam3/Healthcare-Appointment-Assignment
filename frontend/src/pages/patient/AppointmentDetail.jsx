import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../../api/axios';

export default function AppointmentDetail() {
  const { id } = useParams();
  const [appt, setAppt] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/appointments/${id}/summary`).then(r => setAppt(r.data)).catch(console.error).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <p className="text-gray-500">Loading…</p>;
  if (!appt) return <p className="text-red-500">Appointment not found.</p>;

  const pre = appt.preVisitSummary;
  const post = appt.postVisitSummary;

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold text-gray-800">Appointment Detail</h1>
      <div className="bg-white rounded shadow p-5">
        <p><strong>Doctor:</strong> Dr. {appt.doctor?.name} ({appt.doctor?.specialization})</p>
        <p><strong>Time:</strong> {new Date(appt.slotStartTime).toLocaleString()}</p>
        <p><strong>Status:</strong> {appt.status.replace(/_/g, ' ')}</p>
      </div>

      {pre && (pre.status === 'llm_failed'
        ? <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-4 rounded text-sm">
            <strong>AI pre-visit summary unavailable.</strong><br/>
            <p className="mt-1 whitespace-pre-wrap">{pre.raw}</p>
          </div>
        : <div className="bg-blue-50 border border-blue-200 p-4 rounded">
            <p className="font-semibold text-blue-800 mb-2">Pre-Visit Summary</p>
            <p className="text-sm"><span className={`inline-block px-2 py-0.5 rounded text-white text-xs font-bold mr-2 ${pre.urgency_level === 'High' ? 'bg-red-500' : pre.urgency_level === 'Medium' ? 'bg-yellow-500' : 'bg-green-500'}`}>{pre.urgency_level}</span>{pre.chief_complaint}</p>
            {pre.suggested_questions?.length > 0 && <ul className="text-sm mt-2 list-disc list-inside text-blue-900">{pre.suggested_questions.map((q, i) => <li key={i}>{q}</li>)}</ul>}
          </div>
      )}

      {post && (post.status === 'llm_failed'
        ? <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-4 rounded text-sm">
            <strong>AI post-visit summary unavailable.</strong><br/>
            <p className="mt-1 whitespace-pre-wrap">{post.raw}</p>
          </div>
        : <div className="bg-green-50 border border-green-200 p-4 rounded">
            <p className="font-semibold text-green-800 mb-2">Post-Visit Summary</p>
            <p className="text-sm text-green-900">{post.summary_text}</p>
            {post.medication_schedule?.length > 0 && <>
              <p className="font-medium text-green-800 mt-3 mb-1">Medication Schedule</p>
              <ul className="text-sm list-disc list-inside text-green-900">
                {post.medication_schedule.map((m, i) => <li key={i}>{m.medication} — {m.dose}, {m.frequency} for {m.duration}</li>)}
              </ul>
            </>}
            {post.follow_up_steps?.length > 0 && <>
              <p className="font-medium text-green-800 mt-3 mb-1">Follow-up Steps</p>
              <ol className="text-sm list-decimal list-inside text-green-900">{post.follow_up_steps.map((s, i) => <li key={i}>{s}</li>)}</ol>
            </>}
          </div>
      )}

      {appt.prescriptions?.length > 0 && (
        <div className="bg-white rounded shadow p-5">
          <p className="font-semibold mb-2">Prescriptions</p>
          <ul className="text-sm space-y-1">
            {appt.prescriptions.map(rx => <li key={rx.id} className="text-gray-700">{rx.drugName} — {rx.dosage}, {rx.frequency}, {rx.durationDays} days</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}
