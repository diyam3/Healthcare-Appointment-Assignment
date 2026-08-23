import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { User, Mail, Lock, Stethoscope } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/axios';
import { getPasswordStrength } from '../utils/passwordStrength';

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const strength = getPasswordStrength(form.password);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/auth/register', form);
      toast.success('Account created! Please sign in.');
      navigate('/login');
    } catch (err) {
      toast.error(err.response?.data?.message || err.response?.data?.errors?.[0]?.msg || 'Registration failed');
    } finally { setLoading(false); }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-100 rounded-2xl mb-4">
            <Stethoscope size={28} className="text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Create your account</h1>
          <p className="text-slate-500 text-sm mt-1">Patient registration — free and secure</p>
        </div>

        <div className="card p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="label">Full name</label>
              <div className="relative">
                <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="text" required autoComplete="name"
                  value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="input pl-9" placeholder="Jane Smith" />
              </div>
            </div>
            <div>
              <label className="label">Email address</label>
              <div className="relative">
                <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="email" required autoComplete="email"
                  value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  className="input pl-9" placeholder="you@example.com" />
              </div>
            </div>
            <div>
              <label className="label">Password</label>
              <div className="relative">
                <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="password" required autoComplete="new-password" minLength={8}
                  value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  className="input pl-9" placeholder="Min. 8 characters" />
              </div>
              {/* Password strength meter */}
              {form.password && (
                <div className="mt-2">
                  <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${strength.color}`}
                      style={{ width: strength.width }}
                    />
                  </div>
                  <p className={`text-xs mt-1 font-medium ${
                    strength.score <= 1 ? 'text-red-500' :
                    strength.score === 2 ? 'text-orange-500' :
                    strength.score === 3 ? 'text-yellow-600' : 'text-green-600'
                  }`}>
                    {strength.label && `Password strength: ${strength.label}`}
                  </p>
                </div>
              )}
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full justify-center flex items-center gap-2 py-2.5">
              {loading ? (
                <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Creating account…</>
              ) : 'Create Account'}
            </button>
          </form>
        </div>

        <p className="text-center mt-5 text-sm text-slate-600">
          Already have an account?{' '}
          <Link to="/login" className="text-blue-600 font-medium hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
