import { useState, useEffect } from 'react';
import type { DashboardStats, Film, DiaryEntry } from '../types';

const API_BASE = '/api';

export function useDashboardStats() {
  const [data, setData] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API_BASE}/dashboard`)
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch');
        return res.json();
      })
      .then(setData)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return { data, loading, error };
}

export function useCalendarData(year?: number) {
  const [data, setData] = useState<{ date: string; count: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const url = year ? `${API_BASE}/calendar?year=${year}` : `${API_BASE}/calendar`;
    fetch(url)
      .then(res => res.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, [year]);

  return { data, loading };
}

export function useFilms(sort: string = 'title', order: string = 'asc') {
  const [data, setData] = useState<Film[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/films?sort=${sort}&order=${order}`)
      .then(res => res.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, [sort, order]);

  return { data, loading };
}

export function useDiary(year?: number, month?: number) {
  const [data, setData] = useState<DiaryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let url = `${API_BASE}/diary`;
    const params = new URLSearchParams();
    if (year) params.append('year', year.toString());
    if (month) params.append('month', month.toString());
    if (params.toString()) url += `?${params.toString()}`;

    fetch(url)
      .then(res => res.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, [year, month]);

  return { data, loading };
}

export function useFilmDetail(filmId: number | null) {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!filmId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    fetch(`${API_BASE}/films/${filmId}`)
      .then(res => res.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, [filmId]);

  return { data, loading };
}

export function useWatchlist() {
  const [data, setData] = useState<Film[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/watchlist`)
      .then(res => res.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  return { data, loading };
}

export function useReviews() {
  const [data, setData] = useState<DiaryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/reviews`)
      .then(res => res.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  return { data, loading };
}

export function useProfile() {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/profile`)
      .then(res => res.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  return { data, loading };
}

export function useInsights() {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/insights`)
      .then(res => res.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  return { data, loading };
}

export function useExplorer(sort: string = 'title', order: string = 'asc', search: string = '', page: number = 1, perPage: number = 20) {
  const [data, setData] = useState<{ count: number; page: number; per_page: number; total_pages: number; films: any[] } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ sort, order, page: page.toString(), per_page: perPage.toString() });
    if (search) params.append('search', search);

    fetch(`${API_BASE}/films/explorer?${params.toString()}`)
      .then(res => res.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, [sort, order, search, page, perPage]);

  return { data, loading };
}

export function useSyncStatus(pollInterval: number = 0) {
  const [data, setData] = useState<{
    is_running: boolean;
    running_since: string | null;
    last_sync: string | null;
    last_sync_status: string | null;
    last_sync_items: number | null;
    last_sync_error: string | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStatus = () => {
    fetch(`${API_BASE}/sync/status`)
      .then(res => res.json())
      .then(setData)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchStatus();
    if (pollInterval > 0) {
      const interval = setInterval(fetchStatus, pollInterval);
      return () => clearInterval(interval);
    }
  }, [pollInterval]);

  return { data, loading, refetch: fetchStatus };
}

export async function triggerSync(username: string): Promise<{ status: string; username: string; includes_tmdb: boolean }> {
  const res = await fetch(`${API_BASE}/sync/${username}`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to trigger sync');
  return res.json();
}
