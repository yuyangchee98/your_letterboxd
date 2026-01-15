import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useProfile, useSyncStatus, triggerSync } from '../hooks/useApi';

export default function Profile() {
  const { data: profile, loading } = useProfile();
  const [pollInterval, setPollInterval] = useState(0);
  const { data: syncStatus } = useSyncStatus(pollInterval);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  useEffect(() => {
    if (syncStatus?.is_running) {
      setPollInterval(5000);
      setSyncing(true);
    } else if (syncing && !syncStatus?.is_running) {
      setPollInterval(0);
      setSyncing(false);
      if (syncStatus?.last_sync_status === 'failed') {
        setSyncMessage('Sync paused — will resume on next run');
      } else {
        setSyncMessage('Sync completed!');
      }
      setTimeout(() => setSyncMessage(null), 8000);
    }
  }, [syncStatus?.is_running]);

  const handleSync = async () => {
    if (!profile?.username) return;
    setSyncing(true);
    setSyncMessage(null);
    setPollInterval(5000);
    try {
      await triggerSync(profile.username);
    } catch {
      setSyncMessage('Failed to start sync');
      setSyncing(false);
      setPollInterval(0);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-[var(--text-muted)]">Loading profile...</div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center py-12">
        <p className="text-[var(--text-muted)]">No profile found</p>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <div className="bg-white rounded-xl p-6 border border-cream-200 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-display font-semibold text-[var(--text-primary)]">Sync</h2>
            <p className="text-[var(--text-muted)] text-sm mt-1">
              Fetches your latest films, ratings, and diary entries from Letterboxd, then enriches with TMDB data.
            </p>
            <p className="text-[var(--text-subtle)] text-xs mt-1">
              Syncs automatically once per day. Initial sync may take a few minutes depending on your library size. Sync can safely resume if interrupted.
            </p>
          </div>
          <button
            onClick={handleSync}
            disabled={syncing}
            className={`px-5 py-2.5 rounded-lg font-medium transition-colors ${
              syncing
                ? 'bg-cream-100 text-[var(--text-muted)] cursor-not-allowed'
                : 'bg-sage text-white hover:bg-sage-dark'
            }`}
          >
            {syncing ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Syncing...
              </span>
            ) : (
              'Sync Now'
            )}
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          {syncStatus?.last_sync && (
            <span className="text-[var(--text-muted)]">
              Last synced: {new Date(syncStatus.last_sync).toLocaleString()}
              {syncStatus.last_sync_items !== null && ` (${syncStatus.last_sync_items} items)`}
            </span>
          )}
          {syncStatus?.last_sync_status === 'failed' && !syncing && (
            <span className="text-gold">Rate limited — will continue on next sync</span>
          )}
          {!syncStatus?.last_sync && !syncing && (
            <span className="text-[var(--text-subtle)]">No sync yet — click Sync Now to get started</span>
          )}
          {syncMessage && (
            <span className={syncMessage.includes('paused') ? 'text-gold' : syncMessage.includes('Failed') ? 'text-rust' : 'text-sage'}>
              {syncMessage}
            </span>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl p-6 border border-cream-200 shadow-sm">
        <h1 className="text-2xl font-display font-semibold text-[var(--text-primary)]">
          {profile.display_name || profile.username}
        </h1>
        <p className="text-[var(--text-muted)]">@{profile.username}</p>

        {profile.bio && (
          <p className="text-[var(--text-body)] mt-4 leading-relaxed">{profile.bio}</p>
        )}

        <div className="flex gap-6 mt-4 text-sm">
          {profile.location && (
            <span className="text-[var(--text-muted)]">{profile.location}</span>
          )}
          {profile.website && (
            <a
              href={profile.website}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sage hover:text-rust transition-colors"
            >
              {profile.website.replace(/^https?:\/\//, '')}
            </a>
          )}
        </div>
      </div>

      {(profile.stats && Object.keys(profile.stats).length > 0) || (profile.favorites && profile.favorites.length > 0) ? (
        <div>
          <h2 className="text-xl font-display font-semibold text-[var(--text-primary)] mb-4">Letterboxd</h2>

          {profile.favorites && profile.favorites.length > 0 && (
            <div className="mb-6">
              <p className="text-[var(--text-muted)] text-sm mb-3">Favorites</p>
              <div className="grid grid-cols-4 gap-3 max-w-md">
                {(profile.favorites as Array<{ id?: number; slug: string; title: string; year: number; poster_url: string | null; rating: number | null; letterboxd_url: string }>).map((film) =>
                  film.id ? (
                    <Link
                      key={film.slug}
                      to={`/films/${film.id}`}
                      className="group"
                    >
                      <div className="aspect-[2/3] rounded-lg overflow-hidden bg-cream-100 border border-cream-200 group-hover:border-sage transition-colors">
                        {film.poster_url ? (
                          <img
                            src={film.poster_url}
                            alt={film.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[var(--text-muted)] text-xs text-center p-2">
                            {film.title}
                          </div>
                        )}
                      </div>
                      {film.rating && (
                        <p className="text-xs text-[var(--text-muted)] mt-1 text-center">★ {film.rating}</p>
                      )}
                    </Link>
                  ) : (
                    <a
                      key={film.slug}
                      href={film.letterboxd_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group"
                    >
                      <div className="aspect-[2/3] rounded-lg overflow-hidden bg-cream-100 border border-cream-200 group-hover:border-sage transition-colors">
                        <div className="w-full h-full flex items-center justify-center text-[var(--text-muted)] text-xs text-center p-2">
                          {film.title}
                        </div>
                      </div>
                    </a>
                  )
                )}
              </div>
            </div>
          )}

          {profile.stats && Object.keys(profile.stats).length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {profile.stats.films !== undefined && (
                <div className="bg-white p-5 rounded-xl border border-cream-200 shadow-sm">
                  <p className="text-2xl font-mono font-medium text-[var(--text-primary)]">{profile.stats.films}</p>
                  <p className="text-[var(--text-muted)] text-sm">Films</p>
                </div>
              )}
              {profile.stats.this_year !== undefined && (
                <div className="bg-white p-5 rounded-xl border border-cream-200 shadow-sm">
                  <p className="text-2xl font-mono font-medium text-[var(--text-primary)]">{profile.stats.this_year}</p>
                  <p className="text-[var(--text-muted)] text-sm">This Year</p>
                </div>
              )}
              {profile.stats.lists !== undefined && (
                <div className="bg-white p-5 rounded-xl border border-cream-200 shadow-sm">
                  <p className="text-2xl font-mono font-medium text-[var(--text-primary)]">{profile.stats.lists}</p>
                  <p className="text-[var(--text-muted)] text-sm">Lists</p>
                </div>
              )}
              {profile.stats.following !== undefined && (
                <div className="bg-white p-5 rounded-xl border border-cream-200 shadow-sm">
                  <p className="text-2xl font-mono font-medium text-[var(--text-primary)]">{profile.stats.following}</p>
                  <p className="text-[var(--text-muted)] text-sm">Following</p>
                </div>
              )}
              {profile.stats.followers !== undefined && (
                <div className="bg-white p-5 rounded-xl border border-cream-200 shadow-sm">
                  <p className="text-2xl font-mono font-medium text-[var(--text-primary)]">{profile.stats.followers}</p>
                  <p className="text-[var(--text-muted)] text-sm">Followers</p>
                </div>
              )}
            </div>
          )}
        </div>
      ) : null}

      <div>
        <a
          href={`https://letterboxd.com/${profile.username}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sage hover:text-rust transition-colors"
        >
          View on Letterboxd &rarr;
        </a>
      </div>
    </div>
  );
}
