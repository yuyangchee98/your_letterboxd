"""
Sync Letterboxd data to local SQLite database.
"""

import logging
from datetime import datetime
from typing import Optional

from sqlalchemy.orm import Session

from src.db.database import SessionLocal, init_db
from src.db.models import User, Film, DiaryEntry, WatchlistItem, UserFilm, SyncLog
from src.scraper.client import LetterboxdClient

logger = logging.getLogger(__name__)


class LetterboxdSync:
    """Sync Letterboxd data to database."""

    def __init__(self, username: str, min_delay: float = 4.0):
        """
        Initialize sync for a user.

        Args:
            username: Letterboxd username to sync
            min_delay: Seconds between API requests (default: 4.0)
        """
        self.username = username
        self.client = LetterboxdClient(min_delay=min_delay)

    def sync_all(self, db: Session, fetch_film_details: bool = True) -> dict:
        """
        Full sync: user profile, diary, watchlist, and optionally film details.

        Args:
            db: Database session
            fetch_film_details: Whether to fetch full details for each film

        Returns:
            Dict with sync statistics
        """
        sync_log = SyncLog(
            sync_type="full",
            username=self.username,
            started_at=datetime.utcnow(),
            status="running"
        )
        db.add(sync_log)
        db.commit()

        stats = {
            "user_synced": False,
            "watched_films": 0,
            "diary_entries": 0,
            "watchlist_items": 0,
            "films_synced": 0,
            "films_failed": 0,
            "failed_slugs": [],
            "errors": []
        }

        self._failed_films = []

        try:
            logger.info(f"Syncing user profile: {self.username}")
            user = self._sync_user(db)
            stats["user_synced"] = True

            logger.info(f"Syncing watched films for: {self.username}")
            watched_count = self._sync_watched_films(db, user, fetch_film_details)
            stats["watched_films"] = watched_count

            logger.info(f"Syncing diary for: {self.username}")
            diary_count = self._sync_diary(db, user, fetch_film_details)
            stats["diary_entries"] = diary_count

            logger.info(f"Syncing watchlist for: {self.username}")
            watchlist_count = self._sync_watchlist(db, user, fetch_film_details)
            stats["watchlist_items"] = watchlist_count

            stats["films_synced"] = db.query(Film).count()
            stats["films_failed"] = len(self._failed_films)
            stats["failed_slugs"] = self._failed_films

            if self._failed_films:
                logger.warning(f"Failed to fetch {len(self._failed_films)} films:")
                for slug, error in self._failed_films:
                    logger.warning(f"  - {slug}: {error}")

            sync_log.status = "completed" if not self._failed_films else "completed_with_errors"
            sync_log.completed_at = datetime.utcnow()
            sync_log.items_processed = diary_count + watchlist_count
            if self._failed_films:
                sync_log.error_message = f"Failed films: {[s for s, _ in self._failed_films]}"

        except Exception as e:
            logger.error(f"Sync failed: {e}")
            sync_log.status = "failed"
            sync_log.error_message = str(e)
            sync_log.completed_at = datetime.utcnow()
            stats["errors"].append(str(e))
            db.commit()
            raise

        db.commit()

        logger.info(f"Sync complete: {stats['films_synced']} films, {stats['films_failed']} failed")
        return stats

    def _sync_user(self, db: Session) -> User:
        """Sync user profile."""
        user_data = self.client.get_user(self.username)

        user = db.query(User).filter(User.username == self.username).first()
        if not user:
            user = User(username=self.username)
            db.add(user)

        user.display_name = user_data.get("display_name")
        user.bio = user_data.get("bio")
        user.location = user_data.get("location")
        user.website = user_data.get("website")
        user.favorites_json = user_data.get("favorites")
        user.stats_json = user_data.get("stats")
        user.updated_at = datetime.utcnow()

        db.commit()
        return user

    def _sync_watched_films(self, db: Session, user: User, fetch_details: bool) -> int:
        """Sync ALL watched films (including those without diary entries).

        This is the datamaxx approach - captures every film the user has marked
        as watched, even if they never logged a specific watch date.
        """
        watched_films = self.client.get_user_films(self.username)
        total = len(watched_films)
        count = 0

        logger.info(f"Processing {total} watched films...")

        for i, film_data in enumerate(watched_films):
            film_slug = film_data.get("slug")
            if not film_slug:
                continue

            if (i + 1) % 50 == 0:
                logger.info(f"Progress: {i + 1}/{total} films processed")

            film = self._get_or_create_film(db, film_slug, fetch_details)
            if not film:
                continue

            user_film = db.query(UserFilm).filter(
                UserFilm.user_id == user.id,
                UserFilm.film_id == film.id
            ).first()

            if not user_film:
                user_film = UserFilm(
                    user_id=user.id,
                    film_id=film.id,
                    watched=True,
                )
                db.add(user_film)
                count += 1

            user_film.watched = True
            if film_data.get("rating"):
                user_film.rating = film_data["rating"]
            if film_data.get("liked"):
                user_film.liked = True
            user_film.updated_at = datetime.utcnow()

        db.commit()
        return count

    def _sync_diary(self, db: Session, user: User, fetch_details: bool) -> int:
        """Sync user's diary entries and update UserFilm aggregates."""
        diary_entries = self.client.get_user_diary(self.username)
        count = 0
        films_to_update = set()

        for entry_data in diary_entries:
            entry_id = entry_data.get("id")
            film_slug = entry_data.get("film_slug")

            if not film_slug:
                continue

            film = self._get_or_create_film(db, film_slug, fetch_details)
            if not film:
                continue

            films_to_update.add(film.id)

            existing = db.query(DiaryEntry).filter(
                DiaryEntry.letterboxd_id == entry_id
            ).first()

            if existing:
                existing.rating = entry_data.get("rating")
                existing.rewatch = entry_data.get("rewatch", False)
                existing.liked = entry_data.get("liked", False)
                existing.updated_at = datetime.utcnow()
            else:
                watched_date = None
                if entry_data.get("date"):
                    try:
                        watched_date = datetime.strptime(entry_data["date"], "%Y-%m-%d")
                    except (ValueError, TypeError):
                        pass

                entry = DiaryEntry(
                    user_id=user.id,
                    film_id=film.id,
                    letterboxd_id=entry_id,
                    watched_date=watched_date,
                    rating=entry_data.get("rating"),
                    rewatch=entry_data.get("rewatch", False),
                    liked=entry_data.get("liked", False),
                )
                db.add(entry)
                count += 1

        db.commit()

        self._update_user_film_aggregates(db, user, films_to_update)

        return count

    def _update_user_film_aggregates(
        self, db: Session, user: User, film_ids: set
    ) -> None:
        """Update UserFilm records with aggregated diary data."""
        for film_id in film_ids:
            entries = db.query(DiaryEntry).filter(
                DiaryEntry.user_id == user.id,
                DiaryEntry.film_id == film_id
            ).all()

            if not entries:
                continue

            user_film = db.query(UserFilm).filter(
                UserFilm.user_id == user.id,
                UserFilm.film_id == film_id
            ).first()

            if not user_film:
                user_film = UserFilm(
                    user_id=user.id,
                    film_id=film_id,
                    watched=True,
                )
                db.add(user_film)

            user_film.watch_count = len(entries)
            user_film.liked = any(e.liked for e in entries)

            dates = [e.watched_date for e in entries if e.watched_date]
            if dates:
                user_film.first_watched = min(dates)
                user_film.last_watched = max(dates)

            rated_entries = [e for e in entries if e.rating]
            if rated_entries:
                latest_rated = max(rated_entries, key=lambda e: e.watched_date or datetime.min)
                user_film.rating = latest_rated.rating

            user_film.updated_at = datetime.utcnow()

        db.commit()

    def _sync_watchlist(self, db: Session, user: User, fetch_details: bool) -> int:
        """Sync user's watchlist."""
        watchlist = self.client.get_user_watchlist(self.username)
        count = 0

        existing_film_ids = {
            w.film_id for w in db.query(WatchlistItem).filter(
                WatchlistItem.user_id == user.id
            ).all()
        }

        for item_data in watchlist:
            film_slug = item_data.get("slug")
            if not film_slug:
                continue

            film = self._get_or_create_film(db, film_slug, fetch_details)
            if not film:
                continue

            if film.id not in existing_film_ids:
                watchlist_item = WatchlistItem(
                    user_id=user.id,
                    film_id=film.id,
                )
                db.add(watchlist_item)
                count += 1

        db.commit()
        return count

    def _get_or_create_film(
        self, db: Session, slug: str, fetch_details: bool
    ) -> Optional[Film]:
        """Get existing film or create new one, retry if previous fetch failed."""
        film = db.query(Film).filter(Film.slug == slug).first()
        needs_details = film is None or film.title == film.slug

        if film and not needs_details:
            return film

        if not film:
            film = Film(slug=slug)
            db.add(film)

        if fetch_details:
            try:
                details = self.client.get_film(slug)
                film.title = details.get("title") or slug
                film.original_title = details.get("original_title")
                film.year = details.get("year")
                film.letterboxd_id = details.get("letterboxd_id")
                film.alternative_titles_json = details.get("alternative_titles")

                film.poster_url = details.get("poster")
                film.banner_url = details.get("banner")
                film.trailer_json = details.get("trailer")

                film.runtime_minutes = details.get("runtime")
                film.tagline = details.get("tagline")
                film.description = details.get("description")
                film.genres_json = details.get("genres")

                film.rating = details.get("rating")
                film.watchers_stats_json = details.get("watchers_stats")

                film.directors_json = details.get("directors")
                film.crew_json = details.get("crew")
                film.cast_json = details.get("cast")

                film.countries_json = details.get("countries")
                film.languages_json = details.get("languages")
                film.studios_json = details.get("studios")

                film.popular_reviews_json = details.get("popular_reviews")

                film.letterboxd_url = details.get("url")
                film.tmdb_id = details.get("tmdb_id")
                film.imdb_id = details.get("imdb_id")
            except Exception as e:
                error_str = str(e)
                logger.warning(f"Failed to fetch details for {slug}: {e}")
                self._failed_films.append((slug, error_str))
                if "503" in error_str or "Service Unavailable" in error_str:
                    logger.warning("Rate limited by Letterboxd - stopping sync, will resume on next run")
                    raise Exception("Rate limited - sync will resume on next run")
                film.title = slug
        else:
            film.title = slug

        db.commit()
        return film


def run_sync(username: str, fetch_details: bool = True, min_delay: float = 4.0) -> dict:
    """
    Run a full sync for a user.

    Args:
        username: Letterboxd username
        fetch_details: Whether to fetch full film details
        min_delay: Seconds between requests

    Returns:
        Sync statistics dict
    """
    init_db()
    db = SessionLocal()

    try:
        sync = LetterboxdSync(username, min_delay=min_delay)
        return sync.sync_all(db, fetch_film_details=fetch_details)
    finally:
        db.close()


if __name__ == "__main__":
    import sys

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    )

    if len(sys.argv) < 2:
        print("Usage: python -m src.scraper.sync <username>")
        sys.exit(1)

    username = sys.argv[1]
    print(f"Starting sync for user: {username}")

    stats = run_sync(username)
    print(f"\nSync completed:")
    print(f"  Watched films: {stats['watched_films']}")
    print(f"  Diary entries: {stats['diary_entries']}")
    print(f"  Watchlist items: {stats['watchlist_items']}")
    print(f"  Films in database: {stats['films_synced']}")

    if stats['errors']:
        print(f"  Errors: {stats['errors']}")
