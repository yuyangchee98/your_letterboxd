import { Outlet, NavLink } from 'react-router-dom';
import { useTheme } from '../hooks/useTheme';

export default function Layout() {
  const { theme, toggleTheme } = useTheme();
  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    isActive
      ? 'text-rust font-medium border-b-2 border-rust pb-1'
      : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors pb-1 border-b-2 border-transparent';

  return (
    <div className="min-h-screen bg-[var(--bg-cream)]">
      <header className="bg-[var(--bg-white)] border-b border-[var(--border-light)] sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-8 py-5 flex items-center justify-between">
          <NavLink to="/" className="flex items-center gap-3 group">
            <img src="/logo.svg" alt="Your Letterboxd" className="w-9 h-9" />
            <div>
              <h1 className="text-lg font-display font-semibold text-[var(--text-primary)] group-hover:text-rust transition-colors">
                Your Letterboxd
              </h1>
              <p className="text-xs text-[var(--text-subtle)] tracking-wide">a personal film journal</p>
            </div>
          </NavLink>
          <nav className="flex items-center gap-8">
            <NavLink to="/" className={navLinkClass} end>Dashboard</NavLink>
            <NavLink to="/films" className={navLinkClass}>Films</NavLink>
            <NavLink to="/diary" className={navLinkClass}>Diary</NavLink>
            <NavLink to="/watchlist" className={navLinkClass}>Watchlist</NavLink>
            <NavLink to="/insights" className={navLinkClass}>Insights</NavLink>
            <NavLink to="/explorer" className={navLinkClass}>Explorer</NavLink>
            <NavLink to="/profile" className={navLinkClass}>Profile</NavLink>
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg bg-[var(--bg-warm)] hover:bg-[var(--bg-highlight)] transition-colors"
              aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            >
              {theme === 'light' ? (
                <svg className="w-5 h-5 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              )}
            </button>
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-8 py-12">
        <Outlet />
      </main>

      <footer className="border-t border-[var(--border-light)] mt-auto bg-[var(--bg-warm)]">
        <div className="max-w-6xl mx-auto px-8 py-6 text-center text-sm text-[var(--text-subtle)]">
          Data lovingly synced from Letterboxd & TMDB
        </div>
      </footer>
    </div>
  );
}
