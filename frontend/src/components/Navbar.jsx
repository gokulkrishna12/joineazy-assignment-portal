import { Link } from 'react-router-dom';
import { BookOpenCheck, LogOut, ShieldCheck, GraduationCap, ArrowLeftRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  if (!user) return null;

  const isAdmin = user.role?.toUpperCase() === 'ADMIN';

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm">
            <BookOpenCheck className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-base font-bold leading-tight text-slate-900">
              Joineazy <span className="text-indigo-600">Portal</span>
            </h1>
            <p className="text-xs text-slate-500">
              {isAdmin ? 'Professor Dashboard' : 'Student Workspace'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="hidden items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 sm:flex">
            {isAdmin ? (
              <ShieldCheck className="h-4 w-4 text-indigo-600" />
            ) : (
              <GraduationCap className="h-4 w-4 text-emerald-600" />
            )}
            <span className="text-sm font-medium text-slate-800">{user.name}</span>
            {user.student_id && (
              <span className="rounded-md bg-slate-200 px-1.5 py-0.5 text-xs font-semibold text-slate-700">
                {user.student_id}
              </span>
            )}
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                isAdmin
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'bg-emerald-100 text-emerald-700'
              }`}
            >
              {isAdmin ? 'Professor' : 'Student'}
            </span>
          </div>

          <Link
            to="/auth"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:border-indigo-300 hover:text-indigo-600"
          >
            <ArrowLeftRight className="h-4 w-4" />
            <span className="hidden sm:inline">Switch</span>
          </Link>

          <button
            onClick={logout}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 cursor-pointer"
          >
            <LogOut className="h-4 w-4" />
            <span>Logout</span>
          </button>
        </div>
      </div>
    </header>
  );
}