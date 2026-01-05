import { Link } from 'react-router-dom';
import { useWatchlist } from '../hooks/useApi';

export default function Watchlist() {
  const { data: films, loading } = useWatchlist();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-[var(--text-muted)]">Loading watchlist...</div>
      </div>
    );
  }

  const totalRuntime = films.reduce((sum: number, f: any) => sum + (f.runtime_minutes || 0), 0);
  const totalHours = Math.round(totalRuntime / 60);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-display font-semibold text-[var(--text-primary)]">Watchlist</h2>
        <p className="text-[var(--text-muted)] mt-1">
          {films.length} films to watch • {totalHours} hours total
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-5">
        {films.map((film: any) => (
          <Link key={film.id} to={`/films/${film.id}`} className="group">
            <div className="aspect-[2/3] bg-cream-100 rounded-lg overflow-hidden mb-2 shadow-sm">
              {film.poster_url ? (
                <img
                  src={film.poster_url}
                  alt={film.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[var(--text-muted)] text-xs text-center p-2">
                  {film.title}
                </div>
              )}
            </div>
            <p className="text-sm text-[var(--text-primary)] truncate group-hover:text-rust transition-colors">{film.title}</p>
            <p className="text-xs text-[var(--text-muted)]">
              {film.year}
              {film.letterboxd_rating && ` • ★ ${film.letterboxd_rating.toFixed(1)}`}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
