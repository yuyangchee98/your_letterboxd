import { useState, useEffect } from 'react';
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
        <div className="animate-pulse text-[#99aabb]">Loading profile...</div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center py-12">
        <p className="text-[#99aabb]">No profile found</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="bg-[#1c2228] rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-white">Sync</h2>
            <p className="text-[#99aabb] text-sm mt-1">
              Fetches your latest films, ratings, and diary entries from Letterboxd, then enriches with TMDB data.
            </p>
            <p className="text-[#667788] text-xs mt-1">
              Syncs automatically once per day. Initial sync may take a few minutes depending on your library size. Sync can safely resume if interrupted.
            </p>
          </div>
          <button
            onClick={handleSync}
            disabled={syncing}
            className={`px-4 py-2 rounded font-medium transition-colors ${
              syncing
                ? 'bg-[#2c3440] text-[#99aabb] cursor-not-allowed'
                : 'bg-[#00e054] text-black hover:bg-[#00c049]'
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
            <span className="text-[#99aabb]">
              Last synced: {new Date(syncStatus.last_sync).toLocaleString()}
              {syncStatus.last_sync_items !== null && ` (${syncStatus.last_sync_items} items)`}
            </span>
          )}
          {syncStatus?.last_sync_status === 'failed' && !syncing && (
            <span className="text-yellow-500">Rate limited — will continue on next sync</span>
          )}
          {!syncStatus?.last_sync && !syncing && (
            <span className="text-[#667788]">No sync yet — click Sync Now to get started</span>
          )}
          {syncMessage && (
            <span className={syncMessage.includes('paused') ? 'text-yellow-500' : syncMessage.includes('Failed') ? 'text-red-400' : 'text-[#00e054]'}>
              {syncMessage}
            </span>
          )}
        </div>
      </div>

      <div className="bg-[#1c2228] rounded-lg p-6">
        <h1 className="text-2xl font-bold text-white">
          {profile.display_name || profile.username}
        </h1>
        <p className="text-[#99aabb]">@{profile.username}</p>

        {profile.bio && (
          <p className="text-[#ddd] mt-4">{profile.bio}</p>
        )}

        <div className="flex gap-6 mt-4 text-sm">
          {profile.location && (
            <span className="text-[#99aabb]">{profile.location}</span>
          )}
          {profile.website && (
            <a
              href={profile.website}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#00e054] hover:underline"
            >
              {profile.website.replace(/^https?:\/\//, '')}
            </a>
          )}
        </div>
      </div>

      {profile.stats && Object.keys(profile.stats).length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-white mb-4">Letterboxd Stats</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {profile.stats.films !== undefined && (
              <div className="bg-[#1c2228] p-4 rounded-lg">
                <p className="text-2xl font-bold text-white">{profile.stats.films}</p>
                <p className="text-[#99aabb] text-sm">Films</p>
              </div>
            )}
            {profile.stats.this_year !== undefined && (
              <div className="bg-[#1c2228] p-4 rounded-lg">
                <p className="text-2xl font-bold text-white">{profile.stats.this_year}</p>
                <p className="text-[#99aabb] text-sm">This Year</p>
              </div>
            )}
            {profile.stats.lists !== undefined && (
              <div className="bg-[#1c2228] p-4 rounded-lg">
                <p className="text-2xl font-bold text-white">{profile.stats.lists}</p>
                <p className="text-[#99aabb] text-sm">Lists</p>
              </div>
            )}
            {profile.stats.following !== undefined && (
              <div className="bg-[#1c2228] p-4 rounded-lg">
                <p className="text-2xl font-bold text-white">{profile.stats.following}</p>
                <p className="text-[#99aabb] text-sm">Following</p>
              </div>
            )}
            {profile.stats.followers !== undefined && (
              <div className="bg-[#1c2228] p-4 rounded-lg">
                <p className="text-2xl font-bold text-white">{profile.stats.followers}</p>
                <p className="text-[#99aabb] text-sm">Followers</p>
              </div>
            )}
          </div>
        </div>
      )}

      {profile.favorites && profile.favorites.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-white mb-4">Favorite Films</h2>
          <div className="flex flex-wrap gap-2">
            {profile.favorites.map((slug: string) => (
              <span
                key={slug}
                className="px-3 py-1 bg-[#2c3440] text-[#99aabb] text-sm rounded"
              >
                {slug.replace(/-/g, ' ')}
              </span>
            ))}
          </div>
        </div>
      )}

      <div>
        <a
          href={`https://letterboxd.com/${profile.username}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#00e054] hover:underline"
        >
          View on Letterboxd &rarr;
        </a>
      </div>
    </div>
  );
}
