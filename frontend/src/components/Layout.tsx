import { Outlet, NavLink } from 'react-router-dom';

export default function Layout() {
  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    isActive
      ? 'text-[#00e054] font-medium'
      : 'text-[#99aabb] hover:text-white transition-colors';

  return (
    <div className="min-h-screen bg-[#14181c]">
      {/* Header */}
      <header className="border-b border-[#2c3440] bg-[#0d1114]">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <NavLink to="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#00e054] to-[#40bcf4] flex items-center justify-center">
              <span className="text-xl font-bold text-[#14181c]">Y</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Your Letterboxd</h1>
              <p className="text-xs text-[#99aabb]">Personal Film Analytics</p>
            </div>
          </NavLink>
          <nav className="flex items-center gap-6">
            <NavLink to="/" className={navLinkClass} end>Dashboard</NavLink>
            <NavLink to="/films" className={navLinkClass}>Films</NavLink>
            <NavLink to="/diary" className={navLinkClass}>Diary</NavLink>
            <NavLink to="/watchlist" className={navLinkClass}>Watchlist</NavLink>
            <NavLink to="/reviews" className={navLinkClass}>Reviews</NavLink>
            <NavLink to="/insights" className={navLinkClass}>Insights</NavLink>
            <NavLink to="/profile" className={navLinkClass}>Profile</NavLink>
          </nav>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="border-t border-[#2c3440] mt-auto">
        <div className="max-w-7xl mx-auto px-6 py-4 text-center text-sm text-[#99aabb]">
          Data synced from Letterboxd
        </div>
      </footer>
    </div>
  );
}
