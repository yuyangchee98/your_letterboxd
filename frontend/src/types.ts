export interface Stats {
  users: number;
  films: number;
  diary_entries: number;
  watchlist_items: number;
}

export interface DashboardStats {
  total_films: number;
  total_hours: number;
  avg_rating: number;
  letterboxd_avg: number;
  films_this_year: number;
  films_this_month: number;
  top_genres: { name: string; count: number }[];
  top_directors: { name: string; count: number }[];
  top_decades: { decade: string; count: number }[];
  rating_distribution: { rating: number; count: number }[];
  films_by_month: { month: string; count: number }[];
  films_by_year: { year: number; count: number }[];
  recent_films: {
    title: string;
    year: number;
    rating: number;
    watched_date: string;
    poster_url?: string;
  }[];
  // Datamaxx stats
  total_watched: number;
  total_logged: number;
  total_unlogged: number;
  // New stats
  top_actors?: { name: string; count: number }[];
  runtime_stats?: {
    avg_runtime: number;
    longest: {
      title: string;
      year: number;
      runtime: number;
      poster_url?: string;
    } | null;
    shortest: {
      title: string;
      year: number;
      runtime: number;
      poster_url?: string;
    } | null;
  };
  total_rewatches?: number;
  total_liked?: number;
  liked_films?: {
    title: string;
    year: number;
    poster_url?: string;
    rating?: number;
  }[];
  // Additional raw data stats
  top_countries?: { name: string; count: number }[];
  top_languages?: { name: string; count: number }[];
  top_studios?: { name: string; count: number }[];
  top_writers?: { name: string; count: number }[];
  top_composers?: { name: string; count: number }[];
  top_cinematographers?: { name: string; count: number }[];
}

export interface Film {
  id: number;
  slug?: string;
  title: string;
  year: number;
  rating: number;
  letterboxd_rating?: number;
  runtime_minutes?: number;
  poster_url?: string;
  genres?: string[];
  directors?: string[];
  // Datamaxx fields
  watch_count?: number;
  liked?: boolean;
  first_watched?: string;
  last_watched?: string;
  in_diary?: boolean;
}

export interface DiaryEntry {
  id: number;
  watched_date: string;
  rating: number;
  rewatch: boolean;
  liked: boolean;
  review_text?: string;
  film: Film;
}
