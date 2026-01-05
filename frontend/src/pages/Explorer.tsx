import { useState } from 'react';
import { Select, SelectItem, TextInput } from '@tremor/react';
import { useExplorer } from '../hooks/useApi';

function formatCurrency(num: number | null | undefined): string {
  if (!num) return '-';
  if (num >= 1_000_000_000) return `$${(num / 1_000_000_000).toFixed(1)}B`;
  if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(0)}M`;
  if (num >= 1_000) return `$${(num / 1_000).toFixed(0)}K`;
  return `$${num}`;
}

function FilmRow({ film, isExpanded, onToggle }: { film: any; isExpanded: boolean; onToggle: () => void }) {
  const tmdb = film.tmdb;
  const lb = film.letterboxd;
  const user = film.user;

  return (
    <div className="border border-cream-200 rounded-lg overflow-hidden bg-white shadow-sm">
      <div
        className="flex items-center gap-4 p-3 cursor-pointer hover:bg-cream-50 transition-colors"
        onClick={onToggle}
      >
        <div className="w-12 h-18 flex-shrink-0">
          {film.poster_url ? (
            <img src={film.poster_url} alt={film.title} className="w-full h-full object-cover rounded" />
          ) : (
            <div className="w-full h-full bg-cream-100 rounded flex items-center justify-center text-[10px] text-[var(--text-muted)]">
              No img
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="text-[var(--text-primary)] font-medium truncate">{film.title}</h3>
          <p className="text-sm text-[var(--text-muted)]">{film.year}</p>
        </div>

        <div className="flex gap-4 text-sm">
          <div className="text-center">
            <div className="text-sage font-mono font-medium">{user.rating ? `★ ${user.rating}` : '-'}</div>
            <div className="text-[10px] text-[var(--text-muted)]">You</div>
          </div>
          <div className="text-center">
            <div className="text-ink font-mono font-medium">{lb.rating ? lb.rating.toFixed(1) : '-'}</div>
            <div className="text-[10px] text-[var(--text-muted)]">LB</div>
          </div>
          <div className="text-center">
            <div className="text-gold font-mono font-medium">{tmdb?.vote_average ? tmdb.vote_average.toFixed(1) : '-'}</div>
            <div className="text-[10px] text-[var(--text-muted)]">TMDB</div>
          </div>
        </div>

        <div className="w-12 text-center">
          {tmdb?.certification && (
            <span className="px-2 py-0.5 bg-cream-100 text-[var(--text-body)] text-xs rounded">{tmdb.certification}</span>
          )}
        </div>

        <div className="w-20 text-right text-sm text-[var(--text-muted)] font-mono">
          {formatCurrency(tmdb?.budget)}
        </div>

        <div className="w-8 text-center text-[var(--text-muted)]">
          {isExpanded ? '−' : '+'}
        </div>
      </div>

      {isExpanded && (
        <div className="border-t border-cream-200 p-4 bg-cream-50">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="text-ink font-medium mb-3 text-sm uppercase tracking-wide">Letterboxd</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">Rating</span>
                  <span className="text-[var(--text-primary)]">{lb.rating ? `${lb.rating.toFixed(2)} (${lb.rating_count?.toLocaleString() || '?'} votes)` : '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">Runtime</span>
                  <span className="text-[var(--text-primary)]">{lb.runtime_minutes ? `${lb.runtime_minutes} min` : '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">Directors</span>
                  <span className="text-[var(--text-primary)] truncate ml-4">{lb.directors?.map((d: any) => d.name).join(', ') || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">Genres</span>
                  <span className="text-[var(--text-primary)] truncate ml-4">{lb.genres?.map((g: any) => g.name).join(', ') || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">Countries</span>
                  <span className="text-[var(--text-primary)] truncate ml-4">{lb.countries?.map((c: any) => c.name).join(', ') || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">Studios</span>
                  <span className="text-[var(--text-primary)] truncate ml-4">{lb.studios?.map((s: any) => s.name).join(', ') || '-'}</span>
                </div>
                {lb.tagline && (
                  <div className="pt-2">
                    <span className="text-[var(--text-muted)]">Tagline</span>
                    <p className="text-[var(--text-primary)] italic mt-1 font-display">"{lb.tagline}"</p>
                  </div>
                )}
                {lb.url && (
                  <a href={lb.url} target="_blank" rel="noopener noreferrer" className="text-ink hover:text-rust block mt-2 transition-colors">
                    View on Letterboxd →
                  </a>
                )}
              </div>
            </div>

            <div>
              <h4 className="text-gold font-medium mb-3 text-sm uppercase tracking-wide">TMDB</h4>
              {tmdb ? (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-[var(--text-muted)]">Rating</span>
                    <span className="text-[var(--text-primary)]">{tmdb.vote_average ? `${tmdb.vote_average.toFixed(1)}/10 (${tmdb.vote_count?.toLocaleString()} votes)` : '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--text-muted)]">Budget</span>
                    <span className="text-[var(--text-primary)] font-mono">{tmdb.budget ? `$${tmdb.budget.toLocaleString()}` : '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--text-muted)]">Revenue</span>
                    <span className="text-[var(--text-primary)] font-mono">{tmdb.revenue ? `$${tmdb.revenue.toLocaleString()}` : '-'}</span>
                  </div>
                  {tmdb.budget && tmdb.revenue && (
                    <div className="flex justify-between">
                      <span className="text-[var(--text-muted)]">ROI</span>
                      <span className={`font-mono ${tmdb.revenue > tmdb.budget ? 'text-sage' : 'text-rust'}`}>
                        {((tmdb.revenue / tmdb.budget - 1) * 100).toFixed(0)}%
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-[var(--text-muted)]">Certification</span>
                    <span className="text-[var(--text-primary)]">{tmdb.certification || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--text-muted)]">Release Date</span>
                    <span className="text-[var(--text-primary)]">{tmdb.release_date || '-'}</span>
                  </div>
                  {tmdb.collection && (
                    <div className="flex justify-between">
                      <span className="text-[var(--text-muted)]">Collection</span>
                      <span className="text-[var(--text-primary)]">{tmdb.collection.name}</span>
                    </div>
                  )}
                  {tmdb.keywords && tmdb.keywords.length > 0 && (
                    <div className="pt-2">
                      <span className="text-[var(--text-muted)]">Keywords</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {tmdb.keywords.slice(0, 10).map((kw: any) => (
                          <span key={kw.id} className="px-2 py-0.5 bg-cream-100 text-[var(--text-muted)] text-xs rounded-full border border-cream-200">
                            {kw.name}
                          </span>
                        ))}
                        {tmdb.keywords.length > 10 && (
                          <span className="text-[var(--text-muted)] text-xs">+{tmdb.keywords.length - 10} more</span>
                        )}
                      </div>
                    </div>
                  )}
                  {tmdb.watch_providers?.US?.flatrate && tmdb.watch_providers.US.flatrate.length > 0 && (
                    <div className="pt-2">
                      <span className="text-[var(--text-muted)]">Streaming (US)</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {tmdb.watch_providers.US.flatrate.map((p: any) => (
                          <span key={p.id} className="px-2 py-0.5 bg-sage text-white text-xs rounded font-medium">
                            {p.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-[var(--text-muted)] italic">No TMDB data available</p>
              )}
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-cream-200">
            <h4 className="text-sage font-medium mb-3 text-sm uppercase tracking-wide">Your Activity</h4>
            <div className="flex gap-6 text-sm">
              <div>
                <span className="text-[var(--text-muted)]">Rating: </span>
                <span className="text-[var(--text-primary)] font-mono">{user.rating ? `★ ${user.rating}` : 'Not rated'}</span>
              </div>
              <div>
                <span className="text-[var(--text-muted)]">Watches: </span>
                <span className="text-[var(--text-primary)]">{user.watch_count}</span>
              </div>
              {user.first_watched && (
                <div>
                  <span className="text-[var(--text-muted)]">First watched: </span>
                  <span className="text-[var(--text-primary)]">{new Date(user.first_watched).toLocaleDateString()}</span>
                </div>
              )}
              {user.liked && <span className="text-rust">♥ Liked</span>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Explorer() {
  const [sort, setSort] = useState('title');
  const [order, setOrder] = useState('asc');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(1);
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

  const { data, loading } = useExplorer(sort, order, search, page);

  const toggleExpanded = (id: number) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-[var(--text-muted)]">Loading data...</div>
      </div>
    );
  }

  const films = data?.films || [];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-display font-semibold text-[var(--text-primary)]">Data Explorer</h2>
        <p className="text-[var(--text-muted)] mt-1">
          Browse all your film data from Letterboxd + TMDB
        </p>
      </div>

      <div className="flex flex-wrap gap-4 items-center">
        <form onSubmit={handleSearch} className="flex gap-2">
          <TextInput
            placeholder="Search films..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-64"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-sage text-white rounded-lg font-medium hover:bg-sage-dark transition-colors"
          >
            Search
          </button>
        </form>

        <Select value={sort} onValueChange={(v) => { setSort(v); setPage(1); }} className="w-40">
          <SelectItem value="title">Sort: Title</SelectItem>
          <SelectItem value="year">Sort: Year</SelectItem>
          <SelectItem value="rating">Sort: Your Rating</SelectItem>
          <SelectItem value="budget">Sort: Budget</SelectItem>
          <SelectItem value="revenue">Sort: Revenue</SelectItem>
          <SelectItem value="tmdb_rating">Sort: TMDB Rating</SelectItem>
        </Select>

        <Select value={order} onValueChange={(v) => { setOrder(v); setPage(1); }} className="w-36">
          <SelectItem value="asc">Ascending</SelectItem>
          <SelectItem value="desc">Descending</SelectItem>
        </Select>

        <span className="text-[var(--text-muted)] text-sm ml-auto">
          {data?.count || 0} films (page {data?.page || 1} of {data?.total_pages || 1})
        </span>
      </div>

      <div className="space-y-3">
        {films.map((film: any) => (
          <FilmRow
            key={film.id}
            film={film}
            isExpanded={expandedIds.has(film.id)}
            onToggle={() => toggleExpanded(film.id)}
          />
        ))}
      </div>

      {films.length === 0 && (
        <div className="text-center py-12 text-[var(--text-muted)]">
          No films found
        </div>
      )}

      {data && data.total_pages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <button
            onClick={() => setPage(1)}
            disabled={page === 1}
            className="px-3 py-1 rounded-lg bg-cream-100 text-[var(--text-primary)] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-cream-200 transition-colors"
          >
            First
          </button>
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1 rounded-lg bg-cream-100 text-[var(--text-primary)] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-cream-200 transition-colors"
          >
            Prev
          </button>
          <span className="px-4 text-[var(--text-muted)]">
            Page {page} of {data.total_pages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(data.total_pages, p + 1))}
            disabled={page === data.total_pages}
            className="px-3 py-1 rounded-lg bg-cream-100 text-[var(--text-primary)] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-cream-200 transition-colors"
          >
            Next
          </button>
          <button
            onClick={() => setPage(data.total_pages)}
            disabled={page === data.total_pages}
            className="px-3 py-1 rounded-lg bg-cream-100 text-[var(--text-primary)] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-cream-200 transition-colors"
          >
            Last
          </button>
        </div>
      )}
    </div>
  );
}
