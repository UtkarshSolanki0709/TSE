import { useEffect } from 'react';
import { NavLink, Outlet, useLocation, Link } from 'react-router-dom';
import { useSearchStore } from '../store/useSearchStore';
import { useAuthStore } from '../store/useAuthStore';
import { Search, BarChart3, Home, FolderOpen, BookOpen, Shield, LogOut, Cloud } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

const NAV_ITEMS = [
  { to: '/',          label: 'Home',      icon: Home },
  { to: '/search',    label: 'Search',    icon: Search },
  { to: '/explorer',  label: 'Explorer',  icon: FolderOpen },
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/docs',      label: 'Docs',      icon: BookOpen },
] as const;

const PAGE_TITLES: Record<string, string> = {
  '/': 'Home',
  '/search': 'Search & Crawl',
  '/explorer': 'Scraped Data Explorer',
  '/analytics': 'Analytics & Gaps',
  '/docs': 'Documentation',
};

function LogoIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 256 256" fill="currentColor" xmlns="http://www.w3.org/2000/svg" className="text-indigo-600">
      <path d="M 256 256 L 128 256 C 198.692 256 256 198.692 256 128 C 256 57.308 198.692 0 128 0 C 57.308 0 0 57.308 0 128 C 0 198.692 57.308 256 128 256 L 0 256 L 0 0 L 256 0 Z M 128 104 C 141.255 104 152 114.745 152 128 C 152 141.255 141.255 152 128 152 C 114.745 152 104 141.255 104 128 C 104 114.745 114.745 104 128 104 Z" />
    </svg>
  );
}

export function AppShell() {
  const { initSocket } = useSearchStore();
  const location = useLocation();
  const { mode, user, logout } = useAuthStore();

  useEffect(() => {
    initSocket();
  }, [initSocket]);

  const pageTitle = PAGE_TITLES[location.pathname] || 'Discovery';
  const isCloud = mode === 'cloud';

  return (
    <div className="relative min-h-screen text-slate-900 bg-gradient-to-br from-slate-50 via-indigo-50/40 to-sky-50 overflow-x-hidden selection:bg-indigo-500/20 selection:text-indigo-900">
      <div className="fixed top-0 left-1/4 w-96 h-96 bg-indigo-200/40 rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed bottom-10 right-1/4 w-[30rem] h-[30rem] bg-sky-200/40 rounded-full blur-[140px] pointer-events-none" />
      <div className="fixed top-1/3 right-10 w-80 h-80 bg-purple-200/30 rounded-full blur-[100px] pointer-events-none" />

      <div className="relative z-10 min-h-screen flex flex-col justify-between px-4 py-8 md:py-12">
        <header className="max-w-5xl w-full mx-auto">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <Link to="/" className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-white/80 border border-slate-200/90 shadow-sm rounded-full text-slate-700 text-xs font-semibold hover:border-indigo-300 hover:text-indigo-600 transition-all">
                  <LogoIcon />
                  <span>TinySearchEngine v1.2 — Real-time</span>
                </Link>
                <div className={`inline-flex items-center gap-1.5 px-3 py-1 border shadow-sm rounded-full text-[11px] font-bold ${isCloud ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'}`}>
                  {isCloud ? <Cloud className="w-3 h-3" /> : <Shield className="w-3 h-3" />}
                  <span>{isCloud ? 'Cloud Sync Active' : '100% Local Device Storage'}</span>
                </div>
              </div>
              <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-slate-900 flex items-center gap-3">
                TSE <span className="text-slate-300">/</span> {pageTitle}
              </h1>
            </div>

            <div className="flex items-center gap-3 self-start">
              {isCloud && user && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-white/80 border border-slate-200/90 rounded-full text-sm text-slate-600">
                  <span className="font-medium">{user.email}</span>
                  <button
                    onClick={logout}
                    className="p-1 hover:bg-slate-100 rounded-full transition"
                    title="Sign out"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
              <nav className="flex items-center gap-1.5 p-1.5 bg-white/80 backdrop-blur-xl border border-slate-200/90 shadow-lg shadow-slate-200/50 rounded-2xl">
                {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
                  <NavLink
                    key={to}
                    to={to}
                    end={to === '/'}
                    className={({ isActive }) =>
                      `flex items-center gap-2 px-4 lg:px-5 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
                        isActive
                          ? 'bg-slate-900 text-white shadow-md shadow-slate-900/20 scale-[1.02]'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                      }`
                    }
                  >
                    <Icon className="w-4 h-4" />
                    <span className="hidden sm:inline">{label}</span>
                  </NavLink>
                ))}
              </nav>
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </header>

        <footer className="max-w-5xl w-full mx-auto mt-24 border-t border-slate-200/80 pt-8 text-center text-slate-500 text-xs">
          <div className="flex justify-center gap-8 mb-4">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full shadow-[0_0_8px_rgba(99,102,241,0.6)] ${isCloud ? 'bg-blue-500' : 'bg-emerald-500'}`} />
              <span className="font-medium text-slate-700">{isCloud ? 'PostgreSQL (Render)' : 'Local SQLite (`.data/tse.db`)'}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.6)]" />
              <span className="font-medium text-slate-700">BM25 Scoring Active</span>
            </div>
            <div className="flex items-center gap-2">
              {isCloud ? <Cloud className="w-3.5 h-3.5 text-blue-600" /> : <Shield className="w-3.5 h-3.5 text-emerald-600" />}
              <span className="font-medium text-slate-700">{isCloud ? 'Encrypted Cloud Storage' : 'Zero Cloud Data Hosting'}</span>
            </div>
          </div>
          <p className="mt-4 text-slate-400">TinySearchEngine &copy; 2026. Built with Vite, React 19, and Node.js.</p>
        </footer>
      </div>
    </div>
  );
}
