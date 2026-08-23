import { Brain, FileText, AlertTriangle, HelpCircle, Pill, ListChecks } from 'lucide-react';
import UrgencyBadge from './UrgencyBadge';

export function PreVisitCard({ summary }) {
  if (!summary) return null;

  if (summary.status === 'llm_failed') {
    return (
      <div className="card p-5 border-l-4 border-amber-400 bg-amber-50">
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle size={16} className="text-amber-600" />
          <p className="font-semibold text-amber-800 text-sm">AI Summary Unavailable</p>
        </div>
        <p className="text-sm text-amber-700 whitespace-pre-wrap">{summary.raw}</p>
      </div>
    );
  }

  return (
    <div className="card p-5 border-l-4 border-blue-400">
      <div className="flex items-center gap-2 mb-3">
        <Brain size={16} className="text-blue-600" />
        <p className="font-semibold text-blue-800 text-sm">Pre-Visit AI Summary</p>
      </div>
      <div className="flex items-start gap-3 mb-3">
        <UrgencyBadge level={summary.urgency_level} size="lg" />
      </div>
      {summary.chief_complaint && (
        <div className="mb-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">Chief Complaint</p>
          <p className="text-sm text-slate-800">{summary.chief_complaint}</p>
        </div>
      )}
      {summary.suggested_questions?.length > 0 && (
        <div>
          <div className="flex items-center gap-1 mb-1">
            <HelpCircle size={13} className="text-blue-500" />
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Suggested Questions</p>
          </div>
          <ul className="space-y-1">
            {summary.suggested_questions.map((q, i) => (
              <li key={i} className="text-sm text-slate-700 flex gap-2">
                <span className="text-blue-400 font-bold mt-0.5">›</span>
                <span>{q}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export function PostVisitCard({ summary }) {
  if (!summary) return null;

  if (summary.status === 'llm_failed') {
    return (
      <div className="card p-5 border-l-4 border-amber-400 bg-amber-50">
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle size={16} className="text-amber-600" />
          <p className="font-semibold text-amber-800 text-sm">AI Post-Visit Summary Unavailable</p>
        </div>
        <p className="text-sm text-amber-700 whitespace-pre-wrap">{summary.raw}</p>
      </div>
    );
  }

  return (
    <div className="card p-5 border-l-4 border-emerald-400">
      <div className="flex items-center gap-2 mb-3">
        <FileText size={16} className="text-emerald-600" />
        <p className="font-semibold text-emerald-800 text-sm">Post-Visit Summary</p>
      </div>
      {summary.summary_text && (
        <div className="mb-4 p-3 bg-emerald-50 rounded-lg">
          <p className="text-sm text-emerald-900 leading-relaxed">{summary.summary_text}</p>
        </div>
      )}
      {summary.medication_schedule?.length > 0 && (
        <div className="mb-3">
          <div className="flex items-center gap-1 mb-2">
            <Pill size={13} className="text-emerald-600" />
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Medication Schedule</p>
          </div>
          <ul className="space-y-1.5">
            {summary.medication_schedule.map((m, i) => (
              <li key={i} className="text-sm text-slate-700 bg-slate-50 rounded px-3 py-1.5">
                <span className="font-medium text-slate-800">{m.medication}</span>
                {m.dose && <span className="text-slate-500"> — {m.dose}</span>}
                {m.frequency && <span className="text-slate-500">, {m.frequency}</span>}
                {m.duration && <span className="text-slate-400"> for {m.duration}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
      {summary.follow_up_steps?.length > 0 && (
        <div>
          <div className="flex items-center gap-1 mb-2">
            <ListChecks size={13} className="text-emerald-600" />
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Follow-up Steps</p>
          </div>
          <ol className="space-y-1">
            {summary.follow_up_steps.map((s, i) => (
              <li key={i} className="text-sm text-slate-700 flex gap-2">
                <span className="text-emerald-500 font-bold min-w-[1.2rem]">{i + 1}.</span>
                <span>{s}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
