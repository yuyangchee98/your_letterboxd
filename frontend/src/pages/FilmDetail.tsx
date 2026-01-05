import { useParams, Link } from 'react-router-dom';
import { useFilmDetail } from '../hooks/useApi';

function formatCurrency(num: number | null | undefined): string {
  if (!num) return '-';
  if (num >= 1_000_000_000) return `$${(num / 1_000_000_000).toFixed(1)}B`;
  if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(0)}M`;
  if (num >= 1_000) return `$${(num / 1_000).toFixed(0)}K`;
  return `$${num}`;
}

export default function FilmDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: film, loading } = useFilmDetail(id ? parseInt(id) : null);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-[var(--text-muted)]">Loading film...</div>
      </div>
    );
  }

  if (!film) {
    return (
      <div className="text-center py-12">
        <p className="text-[var(--text-muted)]">Film not found</p>
        <Link to="/films" className="text-sage hover:text-rust mt-4 inline-block">
          Back to films
        </Link>
      </div>
    );
  }

  const formatRuntime = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  return (
    <div className="space-y-10">
      <Link to="/films" className="text-[var(--text-muted)] hover:text-[var(--text-primary)] text-sm transition-colors">
        &larr; Back to films
      </Link>

      <div className="flex flex-col md:flex-row gap-10">
        <div className="w-56 flex-shrink-0">
          {film.poster_url ? (
            <img
              src={film.poster_url}
              alt={film.title}
              className="w-full rounded-lg shadow-md"
            />
          ) : (
            <div className="w-full aspect-[2/3] bg-cream-100 rounded-lg flex items-center justify-center text-[var(--text-muted)]">
              No poster
            </div>
          )}
        </div>

        <div className="flex-1 space-y-5">
          <div>
            <h1 className="text-4xl font-display font-semibold text-[var(--text-primary)]">{film.title}</h1>
            <p className="text-[var(--text-muted)] text-lg mt-1">
              {film.year}
              {film.runtime_minutes && ` • ${formatRuntime(film.runtime_minutes)}`}
            </p>
          </div>

          {film.directors?.length > 0 && (
            <p className="text-[var(--text-muted)]">
              Directed by <span className="text-[var(--text-primary)] font-medium">{film.directors.join(', ')}</span>
            </p>
          )}

          {film.tagline && (
            <p className="text-[var(--text-muted)] italic font-display">"{film.tagline}"</p>
          )}

          <div className="flex gap-8">
            {film.user_rating && (
              <div>
                <p className="text-xs text-[var(--text-muted)] uppercase tracking-wide">Your Rating</p>
                <p className="text-2xl text-sage font-mono font-medium">★ {film.user_rating}</p>
              </div>
            )}
            {film.letterboxd_rating && (
              <div>
                <p className="text-xs text-[var(--text-muted)] uppercase tracking-wide">Letterboxd</p>
                <p className="text-2xl text-gold font-mono font-medium">★ {film.letterboxd_rating.toFixed(2)}</p>
              </div>
            )}
            {film.liked && (
              <div>
                <p className="text-xs text-[var(--text-muted)] uppercase tracking-wide">Liked</p>
                <p className="text-2xl text-rust">♥</p>
              </div>
            )}
          </div>

          {film.watch_count > 0 && (
            <p className="text-[var(--text-muted)]">
              Watched <span className="text-[var(--text-primary)]">{film.watch_count} time{film.watch_count > 1 ? 's' : ''}</span>
              {film.first_watched && (
                <> • First: {new Date(film.first_watched).toLocaleDateString()}</>
              )}
              {film.last_watched && film.last_watched !== film.first_watched && (
                <> • Last: {new Date(film.last_watched).toLocaleDateString()}</>
              )}
            </p>
          )}

          {film.genres?.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {film.genres.map((genre: string) => (
                <span key={genre} className="px-3 py-1 bg-cream-100 text-[var(--text-muted)] text-sm rounded-full border border-cream-200">
                  {genre}
                </span>
              ))}
            </div>
          )}

          <div className="flex gap-5 pt-2">
            {film.letterboxd_url && (
              <a
                href={film.letterboxd_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sage hover:text-rust text-sm transition-colors"
              >
                Letterboxd &rarr;
              </a>
            )}
            {film.imdb_id && (
              <a
                href={`https://www.imdb.com/title/${film.imdb_id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gold hover:text-rust text-sm transition-colors"
              >
                IMDb &rarr;
              </a>
            )}
            {film.tmdb_id && (
              <a
                href={`https://www.themoviedb.org/movie/${film.tmdb_id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-ink hover:text-rust text-sm transition-colors"
              >
                TMDB &rarr;
              </a>
            )}
          </div>
        </div>
      </div>

      {film.description && (
        <div>
          <h2 className="text-xl font-display font-semibold text-[var(--text-primary)] mb-3">Synopsis</h2>
          <p className="text-[var(--text-body)] leading-relaxed">{film.description}</p>
        </div>
      )}

      {film.cast?.length > 0 && (
        <div>
          <h2 className="text-xl font-display font-semibold text-[var(--text-primary)] mb-3">Cast</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {film.cast.map((member: { name: string; character: string }, i: number) => (
              <div key={i} className="text-sm">
                <p className="text-[var(--text-primary)]">{member.name}</p>
                {member.character && (
                  <p className="text-[var(--text-muted)] text-xs">as {member.character}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {film.countries?.length > 0 && (
          <div>
            <p className="text-xs text-[var(--text-muted)] uppercase tracking-wide">Countries</p>
            <p className="text-[var(--text-primary)] text-sm mt-1">{film.countries.map((c: any) => c.name).join(', ')}</p>
          </div>
        )}
        {film.languages?.length > 0 && (
          <div>
            <p className="text-xs text-[var(--text-muted)] uppercase tracking-wide">Languages</p>
            <p className="text-[var(--text-primary)] text-sm mt-1">{film.languages.map((l: any) => l.name).join(', ')}</p>
          </div>
        )}
        {film.studios?.length > 0 && (
          <div>
            <p className="text-xs text-[var(--text-muted)] uppercase tracking-wide">Studios</p>
            <p className="text-[var(--text-primary)] text-sm mt-1">{film.studios.map((s: any) => s.name).join(', ')}</p>
          </div>
        )}
      </div>

      {film.diary_entries?.length > 0 && (
        <div>
          <h2 className="text-xl font-display font-semibold text-[var(--text-primary)] mb-4">Your Watches</h2>
          <div className="space-y-3">
            {film.diary_entries.map((entry: any) => (
              <div key={entry.id} className="bg-white p-5 rounded-lg border border-cream-200 shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="text-[var(--text-muted)]">
                    {entry.watched_date
                      ? new Date(entry.watched_date).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })
                      : 'No date'}
                  </div>
                  {entry.rating && (
                    <span className="text-sage font-mono">★ {entry.rating}</span>
                  )}
                  {entry.liked && <span className="text-rust">♥</span>}
                  {entry.rewatch && (
                    <span className="text-[var(--text-subtle)] text-sm">Rewatch</span>
                  )}
                </div>
                {entry.review_text && (
                  <p className="text-[var(--text-body)] mt-3 text-sm">{entry.review_text}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {film.tmdb && (
        <div className="space-y-8">
          {(film.tmdb.budget || film.tmdb.revenue) && (
            <div>
              <h2 className="text-xl font-display font-semibold text-[var(--text-primary)] mb-4">Box Office</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {film.tmdb.budget > 0 && (
                  <div className="bg-white p-5 rounded-lg border border-cream-200 shadow-sm">
                    <p className="text-xs text-[var(--text-muted)] uppercase tracking-wide">Budget</p>
                    <p className="text-xl text-[var(--text-primary)] font-mono font-medium mt-1">{formatCurrency(film.tmdb.budget)}</p>
                  </div>
                )}
                {film.tmdb.revenue > 0 && (
                  <div className="bg-white p-5 rounded-lg border border-cream-200 shadow-sm">
                    <p className="text-xs text-[var(--text-muted)] uppercase tracking-wide">Box Office</p>
                    <p className="text-xl text-sage font-mono font-medium mt-1">{formatCurrency(film.tmdb.revenue)}</p>
                  </div>
                )}
                {film.tmdb.budget > 0 && film.tmdb.revenue > 0 && (
                  <div className="bg-white p-5 rounded-lg border border-cream-200 shadow-sm">
                    <p className="text-xs text-[var(--text-muted)] uppercase tracking-wide">ROI</p>
                    <p className={`text-xl font-mono font-medium mt-1 ${film.tmdb.revenue > film.tmdb.budget ? 'text-sage' : 'text-rust'}`}>
                      {((film.tmdb.revenue / film.tmdb.budget - 1) * 100).toFixed(0)}%
                    </p>
                  </div>
                )}
                {film.tmdb.certification && (
                  <div className="bg-white p-5 rounded-lg border border-cream-200 shadow-sm">
                    <p className="text-xs text-[var(--text-muted)] uppercase tracking-wide">Rating</p>
                    <p className="text-xl text-[var(--text-primary)] font-mono font-medium mt-1">{film.tmdb.certification}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {film.tmdb.collection && (
            <div>
              <h2 className="text-xl font-display font-semibold text-[var(--text-primary)] mb-4">Part of Collection</h2>
              <div className="bg-white p-4 rounded-lg border border-cream-200 shadow-sm inline-block">
                <p className="text-gold font-medium">{film.tmdb.collection.name}</p>
              </div>
            </div>
          )}

          {film.tmdb.keywords?.length > 0 && (
            <div>
              <h2 className="text-xl font-display font-semibold text-[var(--text-primary)] mb-4">Themes & Keywords</h2>
              <div className="flex flex-wrap gap-2">
                {film.tmdb.keywords.map((keyword: string) => (
                  <span key={keyword} className="px-3 py-1 bg-cream-100 text-[var(--text-muted)] text-sm rounded-full border border-cream-200">
                    {keyword}
                  </span>
                ))}
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}
