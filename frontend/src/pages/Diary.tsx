import { Link } from 'react-router-dom';
import { useDiary } from '../hooks/useApi';

export default function Diary() {
  const { data: entries, loading } = useDiary();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-[var(--text-muted)]">Loading diary...</div>
      </div>
    );
  }

  const groupedEntries: Record<string, typeof entries> = {};
  entries.forEach((entry) => {
    if (entry.watched_date) {
      const date = new Date(entry.watched_date);
      const monthKey = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      if (!groupedEntries[monthKey]) {
        groupedEntries[monthKey] = [];
      }
      groupedEntries[monthKey].push(entry);
    }
  });

  return (
    <div className="space-y-10">
      <div>
        <h2 className="text-3xl font-display font-semibold text-[var(--text-primary)]">Diary</h2>
        <p className="text-[var(--text-muted)] mt-1">{entries.length} entries</p>
      </div>

      {Object.entries(groupedEntries).map(([month, monthEntries]) => (
        <div key={month}>
          <h3 className="text-xl font-display font-medium text-[var(--text-primary)] mb-5 border-b border-cream-200 pb-3">
            {month}
          </h3>
          <div className="space-y-3">
            {monthEntries.map((entry) => {
              const date = entry.watched_date ? new Date(entry.watched_date) : null;
              return (
                <Link
                  key={entry.id}
                  to={`/films/${entry.film.id}`}
                  className="flex items-center gap-5 p-4 bg-white rounded-lg border border-cream-200 hover:border-sage/30 hover:shadow-sm transition-all"
                >
                  <div className="w-14 text-center">
                    <div className="text-2xl font-mono font-medium text-[var(--text-primary)]">
                      {date?.getDate()}
                    </div>
                    <div className="text-xs text-[var(--text-muted)] uppercase tracking-wide">
                      {date?.toLocaleDateString('en-US', { weekday: 'short' })}
                    </div>
                  </div>
                  <div className="w-12 h-18 flex-shrink-0">
                    {entry.film.poster_url ? (
                      <img
                        src={entry.film.poster_url}
                        alt={entry.film.title}
                        className="w-full h-full object-cover rounded shadow-sm"
                      />
                    ) : (
                      <div className="w-full h-full bg-cream-100 rounded" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[var(--text-primary)] font-medium truncate hover:text-rust transition-colors">{entry.film.title}</p>
                    <p className="text-sm text-[var(--text-muted)]">
                      {entry.film.year}
                      {entry.rewatch && ' • Rewatch'}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {entry.liked && (
                      <span className="text-rust" title="Liked">
                        ♥
                      </span>
                    )}
                    {entry.rating && (
                      <span className="text-sage font-mono font-medium">
                        ★ {entry.rating}
                      </span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
