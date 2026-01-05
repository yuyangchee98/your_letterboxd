import { Outlet, NavLink } from 'react-router-dom';

export default function Layout() {
  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    isActive
      ? 'text-rust font-medium border-b-2 border-rust pb-1'
      : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors pb-1 border-b-2 border-transparent';

  return (
    <div className="min-h-screen bg-cream-50">
      <header className="bg-white border-b border-cream-200 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-8 py-5 flex items-center justify-between">
          <NavLink to="/" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-full bg-sage flex items-center justify-center shadow-sm">
              <span className="text-lg font-display font-semibold text-white">Y</span>
            </div>
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
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-8 py-12">
        <Outlet />
      </main>

      <footer className="border-t border-cream-200 mt-auto bg-cream-100">
        <div className="max-w-6xl mx-auto px-8 py-6 text-center text-sm text-[var(--text-subtle)]">
          Data lovingly synced from Letterboxd & TMDB
        </div>
      </footer>
    </div>
  );
}
