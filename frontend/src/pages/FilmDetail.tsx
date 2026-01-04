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
        <div className="animate-pulse text-[#99aabb]">Loading film...</div>
      </div>
    );
  }

  if (!film) {
    return (
      <div className="text-center py-12">
        <p className="text-[#99aabb]">Film not found</p>
        <Link to="/films" className="text-[#00e054] hover:underline mt-4 inline-block">
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
    <div className="space-y-8">
      {/* Back link */}
      <Link to="/films" className="text-[#99aabb] hover:text-white text-sm">
        &larr; Back to films
      </Link>

      {/* Header */}
      <div className="flex flex-col md:flex-row gap-8">
        {/* Poster */}
        <div className="w-48 flex-shrink-0">
          {film.poster_url ? (
            <img
              src={film.poster_url}
              alt={film.title}
              className="w-full rounded-lg shadow-lg"
            />
          ) : (
            <div className="w-full aspect-[2/3] bg-[#2c3440] rounded-lg flex items-center justify-center text-[#99aabb]">
              No poster
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 space-y-4">
          <div>
            <h1 className="text-3xl font-bold text-white">{film.title}</h1>
            <p className="text-[#99aabb] text-lg">
              {film.year}
              {film.runtime_minutes && ` • ${formatRuntime(film.runtime_minutes)}`}
            </p>
          </div>

          {/* Directors */}
          {film.directors?.length > 0 && (
            <p className="text-[#99aabb]">
              Directed by <span className="text-white">{film.directors.join(', ')}</span>
            </p>
          )}

          {/* Tagline */}
          {film.tagline && (
            <p className="text-[#99aabb] italic">"{film.tagline}"</p>
          )}

          {/* Ratings */}
          <div className="flex gap-6">
            {film.user_rating && (
              <div>
                <p className="text-xs text-[#99aabb] uppercase">Your Rating</p>
                <p className="text-2xl text-[#00e054] font-bold">★ {film.user_rating}</p>
              </div>
            )}
            {film.letterboxd_rating && (
              <div>
                <p className="text-xs text-[#99aabb] uppercase">Letterboxd</p>
                <p className="text-2xl text-[#ff8000] font-bold">★ {film.letterboxd_rating.toFixed(2)}</p>
              </div>
            )}
            {film.liked && (
              <div>
                <p className="text-xs text-[#99aabb] uppercase">Liked</p>
                <p className="text-2xl text-[#ff8000]">♥</p>
              </div>
            )}
          </div>

          {/* Watch info */}
          {film.watch_count > 0 && (
            <p className="text-[#99aabb]">
              Watched <span className="text-white">{film.watch_count} time{film.watch_count > 1 ? 's' : ''}</span>
              {film.first_watched && (
                <> • First: {new Date(film.first_watched).toLocaleDateString()}</>
              )}
              {film.last_watched && film.last_watched !== film.first_watched && (
                <> • Last: {new Date(film.last_watched).toLocaleDateString()}</>
              )}
            </p>
          )}

          {/* Genres */}
          {film.genres?.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {film.genres.map((genre: string) => (
                <span key={genre} className="px-2 py-1 bg-[#2c3440] text-[#99aabb] text-sm rounded">
                  {genre}
                </span>
              ))}
            </div>
          )}

          {/* External links */}
          <div className="flex gap-4 pt-2">
            {film.letterboxd_url && (
              <a
                href={film.letterboxd_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#00e054] hover:underline text-sm"
              >
                Letterboxd &rarr;
              </a>
            )}
            {film.imdb_id && (
              <a
                href={`https://www.imdb.com/title/${film.imdb_id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#f5c518] hover:underline text-sm"
              >
                IMDb &rarr;
              </a>
            )}
            {film.tmdb_id && (
              <a
                href={`https://www.themoviedb.org/movie/${film.tmdb_id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#01d277] hover:underline text-sm"
              >
                TMDB &rarr;
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Description */}
      {film.description && (
        <div>
          <h2 className="text-lg font-semibold text-white mb-2">Synopsis</h2>
          <p className="text-[#99aabb] leading-relaxed">{film.description}</p>
        </div>
      )}

      {/* Cast */}
      {film.cast?.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-white mb-2">Cast</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
            {film.cast.map((member: { name: string; character: string }, i: number) => (
              <div key={i} className="text-sm">
                <p className="text-white">{member.name}</p>
                {member.character && (
                  <p className="text-[#99aabb] text-xs">as {member.character}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Details */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {film.countries?.length > 0 && (
          <div>
            <p className="text-xs text-[#99aabb] uppercase">Countries</p>
            <p className="text-white text-sm">{film.countries.map((c: any) => c.name).join(', ')}</p>
          </div>
        )}
        {film.languages?.length > 0 && (
          <div>
            <p className="text-xs text-[#99aabb] uppercase">Languages</p>
            <p className="text-white text-sm">{film.languages.map((l: any) => l.name).join(', ')}</p>
          </div>
        )}
        {film.studios?.length > 0 && (
          <div>
            <p className="text-xs text-[#99aabb] uppercase">Studios</p>
            <p className="text-white text-sm">{film.studios.map((s: any) => s.name).join(', ')}</p>
          </div>
        )}
      </div>

      {/* Diary entries */}
      {film.diary_entries?.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-white mb-4">Your Watches</h2>
          <div className="space-y-3">
            {film.diary_entries.map((entry: any) => (
              <div key={entry.id} className="bg-[#1c2228] p-4 rounded-lg">
                <div className="flex items-center gap-4">
                  <div className="text-[#99aabb]">
                    {entry.watched_date
                      ? new Date(entry.watched_date).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })
                      : 'No date'}
                  </div>
                  {entry.rating && (
                    <span className="text-[#00e054]">★ {entry.rating}</span>
                  )}
                  {entry.liked && <span className="text-[#ff8000]">♥</span>}
                  {entry.rewatch && (
                    <span className="text-[#99aabb] text-sm">Rewatch</span>
                  )}
                </div>
                {entry.review_text && (
                  <p className="text-[#99aabb] mt-2 text-sm">{entry.review_text}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TMDB Data Section */}
      {film.tmdb && (
        <div className="space-y-6">
          {/* Box Office */}
          {(film.tmdb.budget || film.tmdb.revenue) && (
            <div>
              <h2 className="text-lg font-semibold text-white mb-4">Box Office</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {film.tmdb.budget > 0 && (
                  <div className="bg-[#1c2228] p-4 rounded-lg">
                    <p className="text-xs text-[#99aabb] uppercase">Budget</p>
                    <p className="text-xl text-white font-bold">{formatCurrency(film.tmdb.budget)}</p>
                  </div>
                )}
                {film.tmdb.revenue > 0 && (
                  <div className="bg-[#1c2228] p-4 rounded-lg">
                    <p className="text-xs text-[#99aabb] uppercase">Box Office</p>
                    <p className="text-xl text-[#00e054] font-bold">{formatCurrency(film.tmdb.revenue)}</p>
                  </div>
                )}
                {film.tmdb.budget > 0 && film.tmdb.revenue > 0 && (
                  <div className="bg-[#1c2228] p-4 rounded-lg">
                    <p className="text-xs text-[#99aabb] uppercase">ROI</p>
                    <p className={`text-xl font-bold ${film.tmdb.revenue > film.tmdb.budget ? 'text-[#00e054]' : 'text-[#ff6666]'}`}>
                      {((film.tmdb.revenue / film.tmdb.budget - 1) * 100).toFixed(0)}%
                    </p>
                  </div>
                )}
                {film.tmdb.certification && (
                  <div className="bg-[#1c2228] p-4 rounded-lg">
                    <p className="text-xs text-[#99aabb] uppercase">Rating</p>
                    <p className="text-xl text-white font-bold">{film.tmdb.certification}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Collection */}
          {film.tmdb.collection && (
            <div>
              <h2 className="text-lg font-semibold text-white mb-4">Part of Collection</h2>
              <div className="bg-[#1c2228] p-4 rounded-lg inline-block">
                <p className="text-[#f5c518] font-medium">{film.tmdb.collection.name}</p>
              </div>
            </div>
          )}

          {/* Keywords */}
          {film.tmdb.keywords?.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-white mb-4">Themes & Keywords</h2>
              <div className="flex flex-wrap gap-2">
                {film.tmdb.keywords.map((keyword: string) => (
                  <span key={keyword} className="px-3 py-1 bg-[#2c3440] text-[#99aabb] text-sm rounded-full">
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
