'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store/authStore';
import { api } from '@/lib/api';
import { Eye, EyeOff, GraduationCap, Shield, User } from 'lucide-react';

const schema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(1, 'Password required'),
});
type FormData = z.infer<typeof schema>;

type LoginRole = 'ADMIN' | 'TEACHER' | 'STUDENT';

const ROLE_CONFIG: Record<LoginRole, {
  label: string; sub: string; icon: React.ElementType;
  accent: string; ring: string; bg: string; emailPlaceholder: string;
}> = {
  ADMIN: {
    label: 'Admin Login', sub: 'Access the administration panel',
    icon: Shield, accent: 'from-indigo-600 to-violet-600',
    ring: 'ring-indigo-500', bg: 'bg-indigo-600',
    emailPlaceholder: 'admin@school.com',
  },
  TEACHER: {
    label: 'Teacher Login', sub: 'Access your classroom tools',
    icon: GraduationCap, accent: 'from-blue-600 to-cyan-600',
    ring: 'ring-blue-500', bg: 'bg-blue-600',
    emailPlaceholder: 'teacher@school.com',
  },
  STUDENT: {
    label: 'Student Login', sub: 'Access your student portal',
    icon: User, accent: 'from-violet-600 to-purple-600',
    ring: 'ring-violet-500', bg: 'bg-violet-600',
    emailPlaceholder: 'student@school.com',
  },
};

const STATUS_PILLS = [
  { label: 'Completed', cls: 'bg-green-100 text-green-700' },
  { label: 'Approved', cls: 'bg-blue-100 text-blue-700' },
  { label: 'Pending', cls: 'bg-amber-100 text-amber-700' },
  { label: 'Paid', cls: 'bg-emerald-100 text-emerald-700' },
  { label: 'Not Applied', cls: 'bg-gray-100 text-gray-500' },
];

export default function LoginPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState<LoginRole>('ADMIN');
  const cfg = ROLE_CONFIG[role];
  const Icon = cfg.icon;

  const { register, handleSubmit, formState: { errors }, reset } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const switchRole = (r: LoginRole) => { setRole(r); reset(); };

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      const res = await api.post('/auth/login', data);
      const { user, accessToken, refreshToken } = res.data.data;
      setAuth(user, accessToken, refreshToken);
      const routes: Record<string, string> = {
        ADMIN: '/admin/dashboard', TEACHER: '/teacher/dashboard',
        STUDENT: '/student/dashboard', PARENT: '/parent/dashboard',
      };
      router.push(routes[user.role] || '/dashboard');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-[#f0f2f8]">
      {/* ── Left panel ────────────────────────────────────────────── */}
      <div className={`hidden lg:flex lg:w-[42%] bg-gradient-to-br ${cfg.accent} flex-col justify-between p-12 relative overflow-hidden transition-all duration-500`}>
        {/* Decorative blobs */}
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-white/5" />
        <div className="absolute top-1/2 -right-20 w-64 h-64 rounded-full bg-white/5" />
        <div className="absolute -bottom-24 left-1/3 w-80 h-80 rounded-full bg-white/5" />

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-11 h-11 bg-white/20 rounded-2xl flex items-center justify-center shadow-lg">
            <GraduationCap className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-lg leading-tight">SchoolMS</p>
            <p className="text-white/60 text-xs">Management Portal</p>
          </div>
        </div>

        {/* Central copy */}
        <div className="relative z-10">
          <p className="text-white/60 text-sm font-medium mb-2">Welcome onboard with us!</p>
          <h1 className="text-4xl font-extrabold text-white leading-tight mb-4">
            The complete<br />school platform
          </h1>
          <p className="text-white/70 text-base mb-10 leading-relaxed">
            Attendance, grades, fees, assignments and communication — all in one place.
          </p>

          {/* Status pill preview */}
          <div className="flex flex-wrap gap-2">
            {STATUS_PILLS.map(p => (
              <span key={p.label} className={`px-3 py-1 rounded-full text-xs font-semibold ${p.cls}`}>{p.label}</span>
            ))}
          </div>

          {/* Mock student card */}
          <div className="mt-8 bg-white/10 backdrop-blur-sm rounded-2xl p-5 border border-white/20">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-white font-bold text-sm">JS</div>
              <div>
                <p className="text-white font-semibold text-sm">Jane Student</p>
                <p className="text-white/60 text-xs">Roll: S2024001 · Grade 10A</p>
              </div>
              <span className="ml-auto text-xs bg-green-400/20 text-green-300 px-2 py-0.5 rounded-full font-medium">Active</span>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              {[{ v: '7.52', l: 'CGPA' }, { v: '92%', l: 'Attendance' }, { v: '4', l: 'Assignments' }].map(i => (
                <div key={i.l} className="bg-white/10 rounded-xl py-2">
                  <p className="text-white font-bold text-lg">{i.v}</p>
                  <p className="text-white/60 text-xs">{i.l}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <p className="relative z-10 text-white/30 text-xs">© {new Date().getFullYear()} SchoolMS. All rights reserved.</p>
      </div>

      {/* ── Right panel ───────────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-[420px]">

          {/* Mobile logo */}
          <div className="flex items-center justify-center gap-2 mb-6 lg:hidden">
            <div className={`w-9 h-9 ${cfg.bg} rounded-xl flex items-center justify-center`}>
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-gray-900 text-xl">SchoolMS</span>
          </div>

          {/* Role tabs */}
          <div className="flex gap-1 p-1 bg-white rounded-2xl shadow-sm border border-gray-100 mb-6">
            {(Object.keys(ROLE_CONFIG) as LoginRole[]).map(r => {
              const RIcon = ROLE_CONFIG[r].icon;
              const active = role === r;
              return (
                <button
                  key={r}
                  onClick={() => switchRole(r)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    active ? `${ROLE_CONFIG[r].bg} text-white shadow-md` : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  <RIcon className="w-3.5 h-3.5" />
                  {r.charAt(0) + r.slice(1).toLowerCase()}
                </button>
              );
            })}
          </div>

          {/* Form card */}
          <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-8">
            {/* Header */}
            <div className="flex items-start gap-4 mb-8">
              <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${cfg.accent} flex items-center justify-center shadow-md flex-shrink-0`}>
                <Icon className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">{cfg.label}</h2>
                <p className="text-gray-400 text-sm mt-0.5">{cfg.sub}</p>
              </div>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div>
                <label className="label">
                  {role === 'STUDENT' ? 'Student Email ID' : role === 'ADMIN' ? 'Admin Email ID' : 'Teacher Email ID'}
                </label>
                <input
                  {...register('email')}
                  type="email"
                  className={`input focus-visible:ring-2 ${cfg.ring}`}
                  placeholder={`Enter your username`}
                  autoComplete="email"
                />
                {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="label !mb-0">Password</label>
                  <a href="/forgot-password" className="text-xs text-primary-600 hover:underline font-medium">Forgot Password?</a>
                </div>
                <div className="relative">
                  <input
                    {...register('password')}
                    type={showPass ? 'text' : 'password'}
                    className={`input pr-10 focus-visible:ring-2 ${cfg.ring}`}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                  />
                  <button type="button" onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
              </div>

              <button
                type="submit"
                disabled={loading}
                className={`w-full py-3 rounded-xl font-semibold text-white bg-gradient-to-r ${cfg.accent} shadow-md hover:opacity-90 active:scale-[0.98] transition-all text-sm`}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Signing in…
                  </span>
                ) : `LogIn as ${role.charAt(0) + role.slice(1).toLowerCase()}`}
              </button>
            </form>

            {/* Alt role links */}
            <div className="mt-5 pt-5 border-t border-gray-50 flex flex-col gap-2 text-center">
              {(Object.keys(ROLE_CONFIG) as LoginRole[]).filter(r => r !== role).map(r => (
                <button key={r} onClick={() => switchRole(r)} className="text-xs text-gray-400 hover:text-primary-600 transition-colors">
                  {r === 'STUDENT' ? 'Are you a student?' : r === 'ADMIN' ? 'Have Admin Access?' : 'Are you a teacher?'}
                  {' '}<span className="font-semibold text-primary-600">LogIn as {r.charAt(0) + r.slice(1).toLowerCase()}</span>
                </button>
              ))}
            </div>
          </div>

          <p className="text-center text-xs text-gray-300 mt-5">Available 24/7 · Help &amp; Support</p>
        </div>
      </div>
    </div>
  );
}
