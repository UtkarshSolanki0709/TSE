import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, X } from 'lucide-react';

const NAV_LINKS = [
  { label: 'Search', path: '/search' },
  { label: 'Analytics', path: '/analytics' },
  { label: 'Explorer', path: '/explorer' },
  { label: 'Docs', path: '/docs' },
] as const;

function LogoIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 256 256"
      fill="white"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M 256 256 L 128 256 C 198.692 256 256 198.692 256 128 C 256 57.308 198.692 0 128 0 C 57.308 0 0 57.308 0 128 C 0 198.692 57.308 256 128 256 L 0 256 L 0 0 L 256 0 Z M 128 104 C 141.255 104 152 114.745 152 128 C 152 141.255 141.255 152 128 152 C 114.745 152 104 141.255 104 128 C 104 114.745 114.745 104 128 104 Z" />
    </svg>
  );
}

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <header className="absolute top-0 left-0 right-0 z-20 px-4 sm:px-6 md:px-10 py-4 sm:py-5 md:py-6">
      <div className="flex items-center justify-between">
        {/* Logo */}
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2.5 transition-opacity hover:opacity-80"
        >
          <LogoIcon />
          <span className="text-base tracking-tight text-white">TSE</span>
        </button>

        {/* Center nav (hidden on mobile) */}
        <nav className="hidden md:flex items-center gap-8">
          {NAV_LINKS.map(({ label, path }) => (
            <button
              key={label}
              onClick={() => navigate(path)}
              className="text-sm text-white/90 hover:text-white transition-colors duration-200"
            >
              {label}
            </button>
          ))}
          <button
            onClick={() => navigate('/login')}
            className="text-sm px-3 py-1.5 rounded-full border border-white/30 text-white hover:bg-white/10 transition-colors duration-200"
          >
            Login
          </button>
        </nav>

        {/* Mobile menu toggle */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="liquid-glass flex h-9 w-9 items-center justify-center rounded-xl md:hidden transition-transform duration-200"
        >
          {menuOpen ? (
            <X size={18} className="text-white" />
          ) : (
            <Menu size={18} className="text-white" />
          )}
        </button>
      </div>

      {/* Mobile nav dropdown */}
      {menuOpen && (
        <nav className="liquid-glass mx-4 mt-3 rounded-2xl p-2 md:hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
          {NAV_LINKS.map(({ label, path }) => (
            <button
              key={label}
              onClick={() => {
                navigate(path);
                setMenuOpen(false);
              }}
              className="block w-full text-left rounded-xl px-4 py-3 text-sm text-white/90 hover:bg-white/10 transition-colors duration-200"
            >
              {label}
            </button>
          ))}
          <button
            onClick={() => {
              navigate('/login');
              setMenuOpen(false);
            }}
            className="block w-full text-left rounded-xl px-4 py-3 text-sm text-white/90 hover:bg-white/10 transition-colors duration-200"
          >
            Login
          </button>
        </nav>
      )}
    </header>
  );
}
