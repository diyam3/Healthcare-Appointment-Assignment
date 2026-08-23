import { Link, Navigate } from 'react-router-dom';
import {
  Stethoscope, CalendarCheck, Brain, Mail, Calendar,
  UserCheck, ClipboardList, ShieldCheck, ArrowRight
} from 'lucide-react';
import { getUser } from '../utils/auth';

const FEATURES = [
  {
    icon: UserCheck,
    color: 'bg-blue-100 text-blue-600',
    title: 'For Patients',
    points: [
      'Search doctors by specialization',
      'Book slots with a temporary hold',
      'AI-generated pre-visit summary before you go in',
      'Post-visit summary & medication schedule in plain language',
      'Email confirmation + Google Calendar invite',
    ],
  },
  {
    icon: ClipboardList,
    color: 'bg-emerald-100 text-emerald-600',
    title: 'For Doctors',
    points: [
      'See today\'s schedule at a glance',
      'Urgency flags highlight high-priority patients',
      'Read the AI pre-visit summary before each consultation',
      'Submit clinical notes and prescriptions in one form',
      'AI converts your notes into a patient-friendly summary',
    ],
  },
  {
    icon: ShieldCheck,
    color: 'bg-violet-100 text-violet-600',
    title: 'For Administrators',
    points: [
      'Create and manage doctor profiles',
      'Set working hours and slot durations per doctor',
      'Mark leave days — affected patients are notified automatically',
      'Full visibility over all appointments',
    ],
  },
];

const HOW_IT_WORKS = [
  { icon: CalendarCheck, label: 'Book a slot',         desc: 'Find a doctor, pick a time. The slot is held for 8 minutes while you complete the form.' },
  { icon: Brain,         label: 'AI prepares the visit', desc: 'Your symptoms are analysed by AI. The doctor sees an urgency level, chief complaint, and suggested questions before you arrive.' },
  { icon: Mail,          label: 'Stay informed',        desc: 'You receive a confirmation email and a Google Calendar invite. Reminders are sent before your appointment and for each medication.' },
];

export default function Home() {
  const user = getUser();

  // Logged-in users skip the landing page
  if (user) {
    if (user.role === 'patient') return <Navigate to="/patient/doctors" replace />;
    if (user.role === 'doctor')  return <Navigate to="/doctor/appointments" replace />;
    if (user.role === 'admin')   return <Navigate to="/admin/doctors" replace />;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ── Navbar ── */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-bold text-blue-700 text-base tracking-tight">
            <Stethoscope size={20} />
            HealthCare
          </Link>
          <div className="flex items-center gap-2">
            <Link to="/login"
              className="text-sm font-medium text-slate-700 px-4 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50 transition-colors">
              Login
            </Link>
            <Link to="/register"
              className="text-sm font-medium text-white bg-blue-600 px-4 py-1.5 rounded-lg hover:bg-blue-700 transition-colors">
              Register
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 py-20 text-center">
          <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 text-xs font-semibold px-3 py-1 rounded-full mb-6 border border-blue-200">
            <Brain size={12} /> AI-assisted healthcare appointments
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 leading-tight mb-5">
            Better appointments,<br className="hidden sm:block" /> before and after the visit
          </h1>
          <p className="text-lg text-slate-500 max-w-2xl mx-auto mb-8 leading-relaxed">
            Book a doctor, describe your symptoms, and let AI prepare both you and your doctor
            before the consultation. Afterwards, get a plain-language summary, your medication
            schedule, and follow-up steps — all in one place.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/register"
              className="inline-flex items-center justify-center gap-2 bg-blue-600 text-white font-semibold px-6 py-3 rounded-xl hover:bg-blue-700 transition-colors text-sm">
              Get started — it's free <ArrowRight size={15} />
            </Link>
            <Link to="/login"
              className="inline-flex items-center justify-center gap-2 border border-slate-300 text-slate-700 font-semibold px-6 py-3 rounded-xl hover:bg-slate-50 transition-colors text-sm">
              Sign in
            </Link>
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="max-w-5xl mx-auto px-4 py-16">
        <h2 className="text-2xl font-bold text-slate-800 text-center mb-10">How it works</h2>
        <div className="grid sm:grid-cols-3 gap-6">
          {HOW_IT_WORKS.map(({ icon: Icon, label, desc }) => (
            <div key={label} className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 rounded-xl mb-4">
                <Icon size={22} className="text-blue-600" />
              </div>
              <h3 className="font-semibold text-slate-800 mb-2">{label}</h3>
              <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Feature highlights ── */}
      <section className="bg-white border-t border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 py-16">
          <h2 className="text-2xl font-bold text-slate-800 text-center mb-10">Built for everyone in the clinic</h2>
          <div className="grid sm:grid-cols-3 gap-6">
            {FEATURES.map(({ icon: Icon, color, title, points }) => (
              <div key={title} className="bg-slate-50 rounded-xl border border-slate-200 p-6">
                <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl mb-4 ${color}`}>
                  <Icon size={18} />
                </div>
                <h3 className="font-semibold text-slate-800 mb-3">{title}</h3>
                <ul className="space-y-2">
                  {points.map(p => (
                    <li key={p} className="flex items-start gap-2 text-sm text-slate-600">
                      <span className="text-blue-400 font-bold mt-0.5 shrink-0">›</span>
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer CTA ── */}
      <section className="max-w-5xl mx-auto px-4 py-16 text-center">
        <h2 className="text-2xl font-bold text-slate-800 mb-3">Ready to get started?</h2>
        <p className="text-slate-500 mb-6 text-sm">Create your patient account in under a minute.</p>
        <Link to="/register"
          className="inline-flex items-center gap-2 bg-blue-600 text-white font-semibold px-6 py-3 rounded-xl hover:bg-blue-700 transition-colors text-sm">
          Register as patient <ArrowRight size={15} />
        </Link>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-slate-200 bg-white">
        <div className="max-w-5xl mx-auto px-4 py-5 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-sm text-slate-500">
            <Stethoscope size={14} className="text-blue-600" />
            <span className="font-medium text-slate-700">HealthCare</span>
            <span>· Healthcare Appointment Manager</span>
          </div>
          <div className="flex gap-4 text-sm">
            <Link to="/login" className="text-slate-500 hover:text-slate-700">Login</Link>
            <Link to="/register" className="text-slate-500 hover:text-slate-700">Register</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
