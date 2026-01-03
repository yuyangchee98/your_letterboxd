"""
FastAPI app to serve Letterboxd data.
"""

import os
from datetime import datetime, timedelta
from typing import Optional
from collections import Counter
from pathlib import Path

from fastapi import FastAPI, Depends, BackgroundTasks, HTTPException
from fastapi.responses import HTMLResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session

from src.db.database import get_db, init_db
from src.db.models import User, Film, DiaryEntry, WatchlistItem, UserFilm, SyncLog
from src.scraper.sync import run_sync

app = FastAPI(
    title="Your Letterboxd",
    description="Local backup and viewer for your Letterboxd data",
    version="0.1.0",
)

# Serve static files (React build)
STATIC_DIR = Path("/app/static")
if STATIC_DIR.exists():
    app.mount("/assets", StaticFiles(directory=STATIC_DIR / "assets"), name="assets")


@app.on_event("startup")
def startup():
    init_db()


# ─────────────────────────────────────────────────────────────────────────────
# API Endpoints
# ─────────────────────────────────────────────────────────────────────────────

@app.post("/api/sync/{username}")
def trigger_sync(
    username: str,
    background_tasks: BackgroundTasks,
    fetch_details: bool = True
):
    """Trigger a sync for a user (runs in background)."""
    background_tasks.add_task(run_sync, username, fetch_details)
    return {"status": "started", "username": username}


@app.get("/api/stats")
def get_stats(db: Session = Depends(get_db)):
    """Get database statistics."""
    return {
        "users": db.query(User).count(),
        "films": db.query(Film).count(),
        "diary_entries": db.query(DiaryEntry).count(),
        "watchlist_items": db.query(WatchlistItem).count(),
    }


@app.get("/api/dashboard")
def get_dashboard(db: Session = Depends(get_db)):
    """Get comprehensive dashboard statistics."""
    now = datetime.utcnow()
    year_start = datetime(now.year, 1, 1)
    month_start = datetime(now.year, now.month, 1)

    entries = db.query(DiaryEntry).all()
    films = db.query(Film).all()
    user_films = db.query(UserFilm).filter(UserFilm.watched == True).all()

    # Efficient lookup structures
    films_dict = {f.id: f for f in films}
    watched_film_ids = {uf.film_id for uf in user_films}

    # Datamaxx stats: total watched vs logged
    total_watched = len(user_films)
    total_logged = sum(1 for uf in user_films if (uf.watch_count or 0) > 0)
    total_unlogged = total_watched - total_logged

    total_films = total_watched  # Now using all watched films
    total_runtime = sum(
        films_dict[fid].runtime_minutes or 0
        for fid in watched_film_ids
        if fid in films_dict and films_dict[fid].runtime_minutes
    )
    total_hours = round(total_runtime / 60, 1)

    # Ratings from user_films (aggregated user ratings for all watched)
    user_ratings = [uf.rating for uf in user_films if uf.rating]
    avg_rating = round(sum(user_ratings) / len(user_ratings), 2) if user_ratings else 0

    # Letterboxd average for all watched films
    lb_ratings = [
        films_dict[fid].rating
        for fid in watched_film_ids
        if fid in films_dict and films_dict[fid].rating
    ]
    letterboxd_avg = round(sum(lb_ratings) / len(lb_ratings), 2) if lb_ratings else 0

    # These need dates, so use diary entries
    films_this_year = sum(1 for e in entries if e.watched_date and e.watched_date >= year_start)
    films_this_month = sum(1 for e in entries if e.watched_date and e.watched_date >= month_start)

    # Top genres (ALL watched films)
    genre_counter = Counter()
    for uf in user_films:
        film = films_dict.get(uf.film_id)
        if film and film.genres_json:
            for g in film.genres_json:
                name = g.get("name") if isinstance(g, dict) else str(g)
                if name and (not isinstance(g, dict) or g.get("type", "genre") == "genre"):
                    genre_counter[name] += 1
    top_genres = [{"name": name, "count": count} for name, count in genre_counter.most_common(10)]

    # Top directors (ALL watched films)
    director_counter = Counter()
    for uf in user_films:
        film = films_dict.get(uf.film_id)
        if film and film.directors_json:
            for d in film.directors_json:
                name = d.get("name") if isinstance(d, dict) else str(d)
                if name:
                    director_counter[name] += 1
    top_directors = [{"name": name, "count": count} for name, count in director_counter.most_common(10)]

    # Top decades (ALL watched films)
    decade_counter = Counter()
    for uf in user_films:
        film = films_dict.get(uf.film_id)
        if film and film.year:
            decade = f"{(film.year // 10) * 10}s"
            decade_counter[decade] += 1
    top_decades = [{"decade": decade, "count": count} for decade, count in decade_counter.most_common(10)]

    # Rating distribution (from user_films ratings)
    rating_dist = Counter()
    for r in user_ratings:
        rating_dist[r] += 1
    rating_distribution = [
        {"rating": r, "count": rating_dist.get(r, 0)}
        for r in [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5]
    ]

    # Films by month (last 12 months)
    films_by_month = []
    for i in range(11, -1, -1):
        month_date = now - timedelta(days=i * 30)
        month_key = month_date.strftime("%b %Y")
        count = sum(
            1 for e in entries
            if e.watched_date and
            e.watched_date.year == month_date.year and
            e.watched_date.month == month_date.month
        )
        films_by_month.append({"month": month_key, "count": count})

    # Films by year
    year_counter = Counter()
    for e in entries:
        if e.watched_date:
            year_counter[e.watched_date.year] += 1
    films_by_year = [
        {"year": year, "count": count}
        for year, count in sorted(year_counter.items())
    ]

    # Recent films
    recent_entries = sorted(
        [e for e in entries if e.watched_date],
        key=lambda e: e.watched_date,
        reverse=True
    )[:12]
    recent_films = []
    for e in recent_entries:
        film = next((f for f in films if f.id == e.film_id), None)
        if film:
            recent_films.append({
                "title": film.title,
                "year": film.year,
                "rating": e.rating,
                "watched_date": e.watched_date.isoformat() if e.watched_date else None,
                "poster_url": film.poster_url,
            })

    # Top actors (ALL watched films)
    actor_counter = Counter()
    for uf in user_films:
        film = films_dict.get(uf.film_id)
        if film and film.cast_json:
            for actor in film.cast_json[:5]:  # Top 5 billed actors per film
                name = actor.get("name") if isinstance(actor, dict) else None
                if name:
                    actor_counter[name] += 1
    top_actors = [{"name": name, "count": count} for name, count in actor_counter.most_common(10)]

    # Top countries (ALL watched films)
    country_counter = Counter()
    for uf in user_films:
        film = films_dict.get(uf.film_id)
        if film and film.countries_json:
            for country in film.countries_json:
                name = country.get("name") if isinstance(country, dict) else None
                if name:
                    country_counter[name] += 1
    top_countries = [{"name": name, "count": count} for name, count in country_counter.most_common(10)]

    # Top languages (ALL watched films)
    language_counter = Counter()
    for uf in user_films:
        film = films_dict.get(uf.film_id)
        if film and film.languages_json:
            for lang in film.languages_json:
                name = lang.get("name") if isinstance(lang, dict) else None
                if name:
                    language_counter[name] += 1
    top_languages = [{"name": name, "count": count} for name, count in language_counter.most_common(10)]

    # Top studios (ALL watched films)
    studio_counter = Counter()
    for uf in user_films:
        film = films_dict.get(uf.film_id)
        if film and film.studios_json:
            for studio in film.studios_json:
                name = studio.get("name") if isinstance(studio, dict) else None
                if name:
                    studio_counter[name] += 1
    top_studios = [{"name": name, "count": count} for name, count in studio_counter.most_common(10)]

    # Top crew: writers, composers, cinematographers (from crew_json)
    writer_counter = Counter()
    composer_counter = Counter()
    cinematographer_counter = Counter()
    for uf in user_films:
        film = films_dict.get(uf.film_id)
        if film and film.crew_json:
            crew = film.crew_json if isinstance(film.crew_json, dict) else {}
            # Writers
            for person in crew.get("writer", []):
                name = person.get("name") if isinstance(person, dict) else None
                if name:
                    writer_counter[name] += 1
            # Composers
            for person in crew.get("composer", []):
                name = person.get("name") if isinstance(person, dict) else None
                if name:
                    composer_counter[name] += 1
            # Cinematographers
            for person in crew.get("cinematography", []):
                name = person.get("name") if isinstance(person, dict) else None
                if name:
                    cinematographer_counter[name] += 1
    top_writers = [{"name": name, "count": count} for name, count in writer_counter.most_common(10)]
    top_composers = [{"name": name, "count": count} for name, count in composer_counter.most_common(10)]
    top_cinematographers = [{"name": name, "count": count} for name, count in cinematographer_counter.most_common(10)]

    # Runtime stats (ALL watched films)
    watched_films_with_runtime = [
        films_dict[fid] for fid in watched_film_ids
        if fid in films_dict and films_dict[fid].runtime_minutes
    ]
    if watched_films_with_runtime:
        runtimes = [f.runtime_minutes for f in watched_films_with_runtime]
        avg_runtime = round(sum(runtimes) / len(runtimes))
        longest_film = max(watched_films_with_runtime, key=lambda f: f.runtime_minutes)
        shortest_film = min(watched_films_with_runtime, key=lambda f: f.runtime_minutes)
        runtime_stats = {
            "avg_runtime": avg_runtime,
            "longest": {
                "title": longest_film.title,
                "year": longest_film.year,
                "runtime": longest_film.runtime_minutes,
                "poster_url": longest_film.poster_url,
            },
            "shortest": {
                "title": shortest_film.title,
                "year": shortest_film.year,
                "runtime": shortest_film.runtime_minutes,
                "poster_url": shortest_film.poster_url,
            },
        }
    else:
        runtime_stats = {"avg_runtime": 0, "longest": None, "shortest": None}

    # Rewatch and liked stats
    total_rewatches = sum(1 for e in entries if e.rewatch)
    total_liked = sum(1 for e in entries if e.liked)
    liked_entries = [e for e in entries if e.liked]
    liked_films_list = []
    for e in sorted(liked_entries, key=lambda x: x.watched_date or datetime.min, reverse=True)[:12]:
        film = next((f for f in films if f.id == e.film_id), None)
        if film:
            liked_films_list.append({
                "title": film.title,
                "year": film.year,
                "poster_url": film.poster_url,
                "rating": e.rating,
            })

    return {
        "total_films": total_films,
        "total_hours": total_hours,
        "avg_rating": avg_rating,
        "letterboxd_avg": letterboxd_avg,
        "films_this_year": films_this_year,
        "films_this_month": films_this_month,
        "top_genres": top_genres,
        "top_directors": top_directors,
        "top_decades": top_decades,
        "rating_distribution": rating_distribution,
        "films_by_month": films_by_month,
        "films_by_year": films_by_year,
        "recent_films": recent_films,
        # Datamaxx stats
        "total_watched": total_watched,
        "total_logged": total_logged,
        "total_unlogged": total_unlogged,
        # New stats
        "top_actors": top_actors,
        "runtime_stats": runtime_stats,
        "total_rewatches": total_rewatches,
        "total_liked": total_liked,
        "liked_films": liked_films_list,
        # Additional raw data stats
        "top_countries": top_countries,
        "top_languages": top_languages,
        "top_studios": top_studios,
        "top_writers": top_writers,
        "top_composers": top_composers,
        "top_cinematographers": top_cinematographers,
    }


@app.get("/api/films")
def get_films(
    sort: str = "title",
    order: str = "asc",
    genre: Optional[str] = None,
    decade: Optional[str] = None,
    logged_only: bool = False,
    db: Session = Depends(get_db)
):
    """Get all watched films with filtering and sorting.

    Args:
        sort: Sort by 'title', 'year', or 'rating'
        order: 'asc' or 'desc'
        genre: Filter by genre name
        decade: Filter by decade (e.g., '1990s')
        logged_only: If True, only return films with diary entries
    """
    # Use UserFilm for the complete watched list (datamaxx approach)
    user_films = db.query(UserFilm).filter(UserFilm.watched == True).all()
    films = {f.id: f for f in db.query(Film).all()}

    result = []
    for uf in user_films:
        film = films.get(uf.film_id)
        if not film:
            continue

        # Filter: logged only
        if logged_only and uf.watch_count == 0:
            continue

        # Filter by genre
        if genre:
            genres = [g.get("name") for g in (film.genres_json or []) if isinstance(g, dict)]
            if genre not in genres:
                continue

        # Filter by decade
        if decade and film.year:
            film_decade = f"{(film.year // 10) * 10}s"
            if film_decade != decade:
                continue

        result.append({
            "id": film.id,
            "title": film.title,
            "year": film.year,
            "poster_url": film.poster_url,
            "rating": uf.rating,
            "letterboxd_rating": film.rating,
            "runtime_minutes": film.runtime_minutes,
            "genres": [g.get("name") for g in (film.genres_json or []) if isinstance(g, dict) and g.get("type") == "genre"],
            "directors": [d.get("name") for d in (film.directors_json or []) if isinstance(d, dict)],
            # Datamaxx extras
            "watch_count": uf.watch_count or 0,
            "liked": uf.liked,
            "first_watched": uf.first_watched.isoformat() if uf.first_watched else None,
            "last_watched": uf.last_watched.isoformat() if uf.last_watched else None,
            "in_diary": (uf.watch_count or 0) > 0,
        })

    # Sort
    reverse = order == "desc"
    if sort == "title":
        result.sort(key=lambda x: x["title"] or "", reverse=reverse)
    elif sort == "year":
        result.sort(key=lambda x: x["year"] or 0, reverse=reverse)
    elif sort == "rating":
        result.sort(key=lambda x: x["rating"] or 0, reverse=reverse)

    return result


@app.get("/api/films/{film_id}")
def get_film_detail(film_id: int, db: Session = Depends(get_db)):
    """Get detailed information for a single film."""
    film = db.query(Film).filter(Film.id == film_id).first()
    if not film:
        raise HTTPException(status_code=404, detail="Film not found")

    # Get user's relationship with this film
    user_film = db.query(UserFilm).filter(UserFilm.film_id == film_id).first()

    # Get diary entries for this film
    diary_entries = db.query(DiaryEntry).filter(DiaryEntry.film_id == film_id).order_by(DiaryEntry.watched_date.desc()).all()

    return {
        "id": film.id,
        "slug": film.slug,
        "title": film.title,
        "year": film.year,
        "poster_url": film.poster_url,
        "letterboxd_url": film.letterboxd_url,
        "letterboxd_rating": film.rating,
        "runtime_minutes": film.runtime_minutes,
        "tagline": film.tagline,
        "description": film.description,
        "genres": [g.get("name") for g in (film.genres_json or []) if isinstance(g, dict) and g.get("type") == "genre"],
        "directors": [d.get("name") for d in (film.directors_json or []) if isinstance(d, dict)],
        "cast": [{"name": c.get("name"), "character": c.get("character")} for c in (film.cast_json or [])[:10] if isinstance(c, dict)],
        "countries": film.countries_json or [],
        "languages": film.languages_json or [],
        "studios": film.studios_json or [],
        "tmdb_id": film.tmdb_id,
        "imdb_id": film.imdb_id,
        # User data
        "user_rating": user_film.rating if user_film else None,
        "liked": user_film.liked if user_film else False,
        "watch_count": user_film.watch_count if user_film else 0,
        "first_watched": user_film.first_watched.isoformat() if user_film and user_film.first_watched else None,
        "last_watched": user_film.last_watched.isoformat() if user_film and user_film.last_watched else None,
        "in_watchlist": db.query(WatchlistItem).filter(WatchlistItem.film_id == film_id).first() is not None,
        # Diary entries
        "diary_entries": [
            {
                "id": e.id,
                "watched_date": e.watched_date.isoformat() if e.watched_date else None,
                "rating": e.rating,
                "liked": e.liked,
                "rewatch": e.rewatch,
                "review_text": e.review_text,
            }
            for e in diary_entries
        ],
    }


@app.get("/api/diary")
def get_diary(
    year: Optional[int] = None,
    month: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """Get diary entries with optional year/month filter."""
    query = db.query(DiaryEntry)

    if year:
        query = query.filter(
            DiaryEntry.watched_date >= datetime(year, 1, 1),
            DiaryEntry.watched_date < datetime(year + 1, 1, 1)
        )
    if month and year:
        next_month = month + 1 if month < 12 else 1
        next_year = year if month < 12 else year + 1
        query = query.filter(
            DiaryEntry.watched_date >= datetime(year, month, 1),
            DiaryEntry.watched_date < datetime(next_year, next_month, 1)
        )

    entries = query.order_by(DiaryEntry.watched_date.desc()).all()
    films = {f.id: f for f in db.query(Film).all()}

    result = []
    for e in entries:
        film = films.get(e.film_id)
        if film:
            result.append({
                "id": e.id,
                "watched_date": e.watched_date.isoformat() if e.watched_date else None,
                "rating": e.rating,
                "liked": e.liked,
                "rewatch": e.rewatch,
                "review_text": e.review_text,
                "film": {
                    "id": film.id,
                    "title": film.title,
                    "year": film.year,
                    "poster_url": film.poster_url,
                }
            })

    return result


@app.get("/api/watchlist")
def get_watchlist(db: Session = Depends(get_db)):
    """Get user's watchlist."""
    watchlist_items = db.query(WatchlistItem).all()
    films = {f.id: f for f in db.query(Film).all()}

    result = []
    for item in watchlist_items:
        film = films.get(item.film_id)
        if film:
            result.append({
                "id": film.id,
                "title": film.title,
                "year": film.year,
                "poster_url": film.poster_url,
                "letterboxd_rating": film.rating,
                "runtime_minutes": film.runtime_minutes,
                "genres": [g.get("name") for g in (film.genres_json or []) if isinstance(g, dict) and g.get("type") == "genre"],
                "directors": [d.get("name") for d in (film.directors_json or []) if isinstance(d, dict)],
                "added_date": item.added_date.isoformat() if item.added_date else None,
            })

    return result


@app.get("/api/reviews")
def get_reviews(db: Session = Depends(get_db)):
    """Get all diary entries with reviews."""
    entries = db.query(DiaryEntry).filter(
        DiaryEntry.review_text.isnot(None),
        DiaryEntry.review_text != ""
    ).order_by(DiaryEntry.watched_date.desc()).all()

    films = {f.id: f for f in db.query(Film).all()}

    result = []
    for e in entries:
        film = films.get(e.film_id)
        if film:
            result.append({
                "id": e.id,
                "watched_date": e.watched_date.isoformat() if e.watched_date else None,
                "rating": e.rating,
                "liked": e.liked,
                "review_text": e.review_text,
                "film": {
                    "id": film.id,
                    "title": film.title,
                    "year": film.year,
                    "poster_url": film.poster_url,
                }
            })

    return result


@app.get("/api/profile")
def get_profile(db: Session = Depends(get_db)):
    """Get user profile."""
    user = db.query(User).first()
    if not user:
        raise HTTPException(status_code=404, detail="No user found")

    return {
        "username": user.username,
        "display_name": user.display_name,
        "bio": user.bio,
        "location": user.location,
        "website": user.website,
        "favorites": user.favorites_json or [],
        "stats": user.stats_json or {},
    }


@app.get("/api/calendar")
def get_calendar(year: Optional[int] = None, db: Session = Depends(get_db)):
    """Get calendar heatmap data for the last 365 days."""
    now = datetime.utcnow()
    start_date = now - timedelta(days=365)

    entries = db.query(DiaryEntry).filter(
        DiaryEntry.watched_date >= start_date
    ).all()

    day_counter = Counter()
    for e in entries:
        if e.watched_date:
            day_key = e.watched_date.strftime("%Y-%m-%d")
            day_counter[day_key] += 1

    result = []
    current = start_date
    while current <= now:
        day_key = current.strftime("%Y-%m-%d")
        result.append({
            "date": day_key,
            "count": day_counter.get(day_key, 0)
        })
        current += timedelta(days=1)

    return result


# ─────────────────────────────────────────────────────────────────────────────
# Serve React SPA
# ─────────────────────────────────────────────────────────────────────────────

@app.get("/{full_path:path}")
async def serve_spa(full_path: str):
    """Serve the React SPA for all routes."""
    if full_path.startswith("api/"):
        raise HTTPException(status_code=404, detail="Not found")

    index_path = STATIC_DIR / "index.html"
    if index_path.exists():
        return FileResponse(index_path)

    return HTMLResponse(content="<h1>Frontend not built</h1>", status_code=200)
