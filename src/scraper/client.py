"""
Rate-limited Letterboxd scraper client.

Uses letterboxdpy with added rate limiting to be respectful to Letterboxd's servers.
Default: 1 request per 2 seconds (30 requests/minute).
"""

import time
import logging
from functools import wraps
from typing import Optional, Any
from datetime import datetime

from letterboxdpy.user import User
from letterboxdpy.movie import Movie

logger = logging.getLogger(__name__)


class RateLimiter:
    """Simple rate limiter with configurable delay between requests."""

    def __init__(self, min_delay: float = 4.0):
        self.min_delay = min_delay
        self.last_request_time: Optional[float] = None

    def wait(self):
        """Wait if necessary to respect rate limit."""
        if self.last_request_time is not None:
            elapsed = time.time() - self.last_request_time
            if elapsed < self.min_delay:
                sleep_time = self.min_delay - elapsed
                logger.debug(f"Rate limiting: sleeping {sleep_time:.2f}s")
                time.sleep(sleep_time)
        self.last_request_time = time.time()


_rate_limiter = RateLimiter(min_delay=4.0)


def rate_limited(func):
    """Decorator to add rate limiting to any function."""
    @wraps(func)
    def wrapper(*args, **kwargs):
        _rate_limiter.wait()
        return func(*args, **kwargs)
    return wrapper


class LetterboxdClient:
    """Rate-limited Letterboxd client wrapping letterboxdpy."""

    def __init__(self, min_delay: float = 4.0):
        """
        Initialize client with rate limiting.

        Args:
            min_delay: Minimum seconds between requests (default: 4.0)
        """
        self.rate_limiter = RateLimiter(min_delay=min_delay)

    def _wait(self):
        """Apply rate limiting before request."""
        self.rate_limiter.wait()

    def get_user(self, username: str) -> dict:
        """
        Get user profile data.

        Returns dict with keys like:
        - username, display_name, bio, location, website
        - favorites (list of film slugs)
        - stats (films, this_year, lists, following, followers)
        """
        self._wait()
        logger.info(f"Fetching user profile: {username}")

        try:
            user = User(username)
        except Exception as e:
            logger.error(f"FAILED to fetch user '{username}': {e}")
            raise
        return {
            "username": user.username,
            "display_name": getattr(user, "display_name", None),
            "bio": getattr(user, "bio", None),
            "location": getattr(user, "location", None),
            "website": getattr(user, "website", None),
            "favorites": getattr(user, "favorites", []),
            "stats": getattr(user, "stats", {}),
        }

    def get_user_films(self, username: str) -> list[dict]:
        """
        Get all films a user has logged (watched).

        Returns list of dicts with film info including user's rating.
        """
        self._wait()
        logger.info(f"Fetching watched films for: {username}")

        try:
            user = User(username)
            films_data = user.get_films()
        except Exception as e:
            logger.error(f"FAILED to fetch watched films for '{username}': {e}")
            raise

        result = []
        if isinstance(films_data, dict):
            movies = films_data.get("movies", {})
            if isinstance(movies, dict):
                for slug, data in movies.items():
                    if not isinstance(data, dict):
                        continue
                    rating = data.get("rating")
                    result.append({
                        "slug": slug,
                        "name": data.get("name"),
                        "year": data.get("year"),
                        "rating": rating,
                        "liked": data.get("liked", False),
                    })
        return result

    def get_user_diary(self, username: str, year: Optional[int] = None) -> list[dict]:
        """
        Get user's diary entries.

        Args:
            username: Letterboxd username
            year: Optional year to filter by

        Returns list of diary entry dicts.
        """
        self._wait()
        logger.info(f"Fetching diary for: {username}" + (f" (year={year})" if year else ""))

        try:
            user = User(username)
            if year:
                diary_data = user.get_diary(year=year)
            else:
                diary_data = user.get_diary()
        except Exception as e:
            logger.error(f"FAILED to fetch diary for '{username}': {e}")
            raise

        entries = []
        if isinstance(diary_data, dict):
            entries_dict = diary_data.get("entries", diary_data)
            for entry_id, data in entries_dict.items():
                if not isinstance(data, dict):
                    continue
                actions = data.get("actions", {})
                date_info = data.get("date", {})

                date_str = None
                if isinstance(date_info, dict) and date_info.get("year"):
                    date_str = f"{date_info['year']}-{date_info.get('month', 1):02d}-{date_info.get('day', 1):02d}"

                rating = actions.get("rating")

                entries.append({
                    "id": entry_id,
                    "film_slug": data.get("slug"),
                    "film_name": data.get("name"),
                    "date": date_str,
                    "rating": rating,
                    "rewatch": actions.get("rewatched", False),
                    "liked": actions.get("liked", False),
                })
        return entries

    def get_user_watchlist(self, username: str) -> list[dict]:
        """
        Get user's watchlist.

        Returns list of film dicts on the watchlist.
        """
        self._wait()
        logger.info(f"Fetching watchlist for: {username}")

        try:
            user = User(username)
            watchlist_data = user.get_watchlist_movies()
        except Exception as e:
            logger.error(f"FAILED to fetch watchlist for '{username}': {e}")
            raise

        result = []
        if isinstance(watchlist_data, dict):
            for film_id, data in watchlist_data.items():
                if not isinstance(data, dict):
                    continue
                result.append({
                    "slug": data.get("slug"),
                    "name": data.get("name"),
                    "year": data.get("year"),
                })
        return result

    def get_film(self, slug: str) -> dict:
        """
        Get detailed film information.

        Args:
            slug: Film slug (e.g., "the-godfather")

        Returns dict with full film details including all available metadata.
        """
        self._wait()
        logger.info(f"Fetching film details: {slug}")

        try:
            movie = Movie(slug)
        except Exception as e:
            logger.error(f"FAILED to fetch film '{slug}': {e}")
            raise

        crew = getattr(movie, "crew", {}) or {}
        directors = crew.get("director", [])

        details = getattr(movie, "details", []) or []
        countries = [d for d in details if d.get("type") == "country"]
        languages = [d for d in details if d.get("type") == "language"]
        studios = [d for d in details if d.get("type") == "studio"]

        import re
        tmdb_link = getattr(movie, "tmdb_link", None)
        tmdb_id = None
        if tmdb_link:
            match = re.search(r'/movie/(\d+)', tmdb_link)
            if match:
                tmdb_id = match.group(1)

        imdb_link = getattr(movie, "imdb_link", None)
        imdb_id = None
        if imdb_link:
            match = re.search(r'/title/(tt\d+)', imdb_link)
            if match:
                imdb_id = match.group(1)

        watchers_stats = None
        try:
            watchers_stats = movie.get_watchers_stats()
        except Exception as e:
            logger.warning(f"Failed to get watchers stats for {slug}: {e}")

        return {
            "slug": slug,
            "letterboxd_id": getattr(movie, "id", None),
            "title": getattr(movie, "title", None),
            "original_title": getattr(movie, "original_title", None),
            "year": getattr(movie, "year", None),
            "alternative_titles": getattr(movie, "alternative_titles", []),

            "poster": getattr(movie, "poster", None),
            "banner": getattr(movie, "banner", None),
            "trailer": getattr(movie, "trailer", None),

            "runtime": getattr(movie, "runtime", None),
            "tagline": getattr(movie, "tagline", None),
            "description": getattr(movie, "description", None),
            "genres": getattr(movie, "genres", []),

            "rating": getattr(movie, "rating", None),
            "watchers_stats": watchers_stats,

            "directors": directors,
            "crew": crew,
            "cast": getattr(movie, "cast", []),

            "countries": countries,
            "languages": languages,
            "studios": studios,

            "popular_reviews": getattr(movie, "popular_reviews", []),

            "url": getattr(movie, "url", None),
            "tmdb_id": tmdb_id,
            "imdb_id": imdb_id,
        }
