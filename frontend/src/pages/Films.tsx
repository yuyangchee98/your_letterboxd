import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Select, SelectItem } from '@tremor/react';
import { useFilms } from '../hooks/useApi';

export default function Films() {
  const [sort, setSort] = useState('title');
  const [order, setOrder] = useState('asc');
  const [showUnloggedOnly, setShowUnloggedOnly] = useState(false);
  const { data: films, loading } = useFilms(sort, order);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-[var(--text-muted)]">Loading films...</div>
      </div>
    );
  }

  const filteredFilms = showUnloggedOnly
    ? films.filter((f) => !f.in_diary)
    : films;

  const loggedCount = films.filter((f) => f.in_diary).length;
  const unloggedCount = films.length - loggedCount;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-3xl font-display font-semibold text-[var(--text-primary)]">Films</h2>
          <p className="text-[var(--text-muted)] mt-1">
            {films.length} watched • {loggedCount} logged • {unloggedCount} unlogged
          </p>
        </div>
        <div className="flex gap-4 items-center">
          <label className="flex items-center gap-2 text-sm text-[var(--text-muted)] cursor-pointer">
            <input
              type="checkbox"
              checked={showUnloggedOnly}
              onChange={(e) => setShowUnloggedOnly(e.target.checked)}
              className="rounded bg-cream-100 border-cream-200 text-sage focus:ring-sage"
            />
            Unlogged only
          </label>
          <Select value={sort} onValueChange={setSort} className="w-32">
            <SelectItem value="title">Title</SelectItem>
            <SelectItem value="year">Year</SelectItem>
            <SelectItem value="rating">Rating</SelectItem>
          </Select>
          <Select value={order} onValueChange={setOrder} className="w-32">
            <SelectItem value="asc">Ascending</SelectItem>
            <SelectItem value="desc">Descending</SelectItem>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-5">
        {filteredFilms.map((film) => (
          <Link key={film.id} to={`/films/${film.id}`} className="group relative">
            <div className={`aspect-[2/3] bg-cream-100 rounded-lg overflow-hidden mb-2 shadow-sm ${!film.in_diary ? 'ring-2 ring-cream-200' : ''}`}>
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
              <div className="absolute top-1 right-1 flex gap-1">
                {film.liked && (
                  <span className="text-rust text-sm" title="Liked">♥</span>
                )}
                {!film.in_diary && (
                  <span className="bg-cream-200 text-[var(--text-muted)] text-[10px] px-1 rounded" title="Not logged in diary">
                    no date
                  </span>
                )}
              </div>
              {(film.watch_count ?? 0) > 1 && (
                <div className="absolute bottom-1 left-1 bg-ink/80 text-white text-[10px] px-1 rounded">
                  ×{film.watch_count}
                </div>
              )}
            </div>
            <p className="text-sm text-[var(--text-primary)] truncate group-hover:text-rust transition-colors">{film.title}</p>
            <p className="text-xs text-[var(--text-muted)]">
              {film.year} {film.rating ? `• ★ ${film.rating}` : ''}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
