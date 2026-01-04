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
from src.db.models import User, Film, DiaryEntry, WatchlistItem, UserFilm, SyncLog, TmdbFilm
from src.scraper.sync import run_sync
from src.scraper.tmdb_sync import TmdbSync, run_tmdb_sync

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

def _full_sync_task(username: str, fetch_details: bool = True):
    """Run Letterboxd sync, then TMDB enrichment."""
    import logging
    logger = logging.getLogger(__name__)

    # Step 1: Letterboxd
    logger.info(f"[1/2] Starting Letterboxd sync for: {username}")
    try:
        stats = run_sync(username, fetch_details)
        logger.info(f"[1/2] Letterboxd sync completed: {stats}")
    except Exception as e:
        logger.error(f"[1/2] Letterboxd sync failed: {e}")
        return

    # Step 2: TMDB (if API key configured)
    tmdb_key = os.environ.get("TMDB_API_KEY")
    if not tmdb_key:
        logger.info("[2/2] TMDB_API_KEY not set, skipping TMDB enrichment")
        return

    logger.info("[2/2] Starting TMDB enrichment...")
    try:
        tmdb_stats = run_tmdb_sync()
        logger.info(f"[2/2] TMDB sync completed: {tmdb_stats['films_enriched']} enriched")
    except Exception as e:
        logger.error(f"[2/2] TMDB sync failed: {e}")


@app.post("/api/sync/{username}")
def trigger_sync(
    username: str,
    background_tasks: BackgroundTasks,
    fetch_details: bool = True
):
    """Trigger full sync: Letterboxd first, then TMDB enrichment (runs in background)."""
    background_tasks.add_task(_full_sync_task, username, fetch_details)
    return {"status": "started", "username": username, "includes_tmdb": bool(os.environ.get("TMDB_API_KEY"))}


@app.post("/api/tmdb/sync")
def trigger_tmdb_sync(
    background_tasks: BackgroundTasks,
    limit: Optional[int] = None,
    force: bool = False
):
    """Trigger TMDB enrichment sync only (runs in background).

    Note: This is for manual TMDB-only sync. Normally TMDB runs automatically after Letterboxd sync.

    Args:
        limit: Max number of films to process (None = all)
        force: Re-fetch even if already enriched
    """
    background_tasks.add_task(run_tmdb_sync, limit, force)
    return {"status": "started", "limit": limit, "force": force}


@app.get("/api/tmdb/status")
def get_tmdb_status(db: Session = Depends(get_db)):
    """Get TMDB enrichment status."""
    try:
        sync = TmdbSync()
        return sync.get_enrichment_status(db)
    except ValueError as e:
        # API key not configured
        return {
            "error": str(e),
            "total_films": db.query(Film).count(),
            "films_with_tmdb_id": db.query(Film).filter(Film.tmdb_id.isnot(None)).count(),
            "films_enriched": db.query(TmdbFilm).count(),
        }


@app.post("/api/tmdb/enrich/{film_id}")
def enrich_single_film(
    film_id: int,
    force: bool = False,
    db: Session = Depends(get_db)
):
    """Enrich a single film with TMDB data."""
    try:
        sync = TmdbSync()
        return sync.enrich_single(db, film_id, force)
    except ValueError as e:
        raise HTTPException(status_code=500, detail=str(e))


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

    # === WATCHING PATTERNS ===

    # Day of week distribution
    day_of_week_counter = Counter()
    for e in entries:
        if e.watched_date:
            day_name = e.watched_date.strftime("%a")  # Mon, Tue, Wed...
            day_of_week_counter[day_name] += 1
    # Ensure all days are present in order
    days_order = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    day_of_week = [{"day": day, "count": day_of_week_counter.get(day, 0)} for day in days_order]

    # Binge days (days with 2+ films watched)
    films_per_day = Counter()
    for e in entries:
        if e.watched_date:
            day_key = e.watched_date.strftime("%Y-%m-%d")
            films_per_day[day_key] += 1
    binge_days = sum(1 for count in films_per_day.values() if count >= 2)
    max_in_one_day = max(films_per_day.values()) if films_per_day else 0

    # Watch streaks (consecutive days with at least 1 film)
    if films_per_day:
        sorted_days = sorted(films_per_day.keys())
        longest_streak = 1
        current_streak = 1
        for i in range(1, len(sorted_days)):
            prev_date = datetime.strptime(sorted_days[i-1], "%Y-%m-%d")
            curr_date = datetime.strptime(sorted_days[i], "%Y-%m-%d")
            if (curr_date - prev_date).days == 1:
                current_streak += 1
                longest_streak = max(longest_streak, current_streak)
            else:
                current_streak = 1
    else:
        longest_streak = 0

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
        # Watching patterns
        "day_of_week": day_of_week,
        "binge_days": binge_days,
        "max_in_one_day": max_in_one_day,
        "longest_streak": longest_streak,
    }


@app.get("/api/insights")
def get_insights(db: Session = Depends(get_db)):
    """Get comprehensive insights and analytics (Letterboxd + TMDB combined)."""
    user_films = db.query(UserFilm).filter(UserFilm.watched == True).all()
    user_films_by_id = {uf.film_id: uf for uf in user_films}
    watched_film_ids = set(user_films_by_id.keys())

    films = {f.id: f for f in db.query(Film).filter(Film.id.in_(watched_film_ids)).all()}
    tmdb_films = {t.film_id: t for t in db.query(TmdbFilm).filter(TmdbFilm.film_id.in_(watched_film_ids)).all()}

    # === RATING STATS (existing) ===
    rated_films = []
    for uf in user_films:
        film = films.get(uf.film_id)
        if uf.rating and film and film.rating:
            gap = uf.rating - film.rating
            rated_films.append({
                "title": film.title,
                "year": film.year,
                "poster_url": film.poster_url,
                "user_rating": uf.rating,
                "letterboxd_rating": round(film.rating, 2),
                "gap": round(gap, 2),
                "film_id": film.id,
            })

    if rated_films:
        avg_user = sum(f["user_rating"] for f in rated_films) / len(rated_films)
        avg_lb = sum(f["letterboxd_rating"] for f in rated_films) / len(rated_films)
        avg_gap = avg_user - avg_lb
    else:
        avg_user = avg_lb = avg_gap = 0

    if avg_gap < -0.3:
        personality = "harsh"
    elif avg_gap > 0.3:
        personality = "generous"
    else:
        personality = "balanced"

    underrated = sorted([f for f in rated_films if f["gap"] > 0], key=lambda x: x["gap"], reverse=True)
    overrated = sorted([f for f in rated_films if f["gap"] < 0], key=lambda x: x["gap"])

    # === GENRE RATINGS ===
    genre_stats = {}  # genre_name -> {ratings: [], count: 0}
    for uf in user_films:
        film = films.get(uf.film_id)
        if not film or not film.genres_json:
            continue
        for g in film.genres_json:
            name = g.get("name") if isinstance(g, dict) else None
            if not name:
                continue
            if name not in genre_stats:
                genre_stats[name] = {"ratings": [], "count": 0}
            genre_stats[name]["count"] += 1
            if uf.rating:
                genre_stats[name]["ratings"].append(uf.rating)

    genre_ratings = []
    for name, stats in genre_stats.items():
        avg_rating = round(sum(stats["ratings"]) / len(stats["ratings"]), 2) if stats["ratings"] else None
        genre_ratings.append({
            "name": name,
            "count": stats["count"],
            "rated_count": len(stats["ratings"]),
            "avg_rating": avg_rating,
        })
    genre_ratings.sort(key=lambda x: x["avg_rating"] or 0, reverse=True)

    # === DIRECTOR RATINGS ===
    director_stats = {}
    for uf in user_films:
        film = films.get(uf.film_id)
        if not film or not film.directors_json:
            continue
        for d in film.directors_json:
            name = d.get("name") if isinstance(d, dict) else None
            if not name:
                continue
            if name not in director_stats:
                director_stats[name] = {"ratings": [], "count": 0}
            director_stats[name]["count"] += 1
            if uf.rating:
                director_stats[name]["ratings"].append(uf.rating)

    director_ratings = []
    for name, stats in director_stats.items():
        if stats["count"] >= 2:  # Only directors with 2+ films
            avg_rating = round(sum(stats["ratings"]) / len(stats["ratings"]), 2) if stats["ratings"] else None
            director_ratings.append({
                "name": name,
                "count": stats["count"],
                "rated_count": len(stats["ratings"]),
                "avg_rating": avg_rating,
            })
    director_ratings.sort(key=lambda x: (x["avg_rating"] or 0, x["count"]), reverse=True)

    # === ACTOR RATINGS ===
    actor_stats = {}
    for uf in user_films:
        film = films.get(uf.film_id)
        if not film or not film.cast_json:
            continue
        for a in film.cast_json[:5]:  # Top 5 billed actors per film
            name = a.get("name") if isinstance(a, dict) else None
            if not name:
                continue
            if name not in actor_stats:
                actor_stats[name] = {"ratings": [], "count": 0}
            actor_stats[name]["count"] += 1
            if uf.rating:
                actor_stats[name]["ratings"].append(uf.rating)

    actor_ratings = []
    for name, stats in actor_stats.items():
        if stats["count"] >= 3:  # Only actors with 3+ films
            avg_rating = round(sum(stats["ratings"]) / len(stats["ratings"]), 2) if stats["ratings"] else None
            actor_ratings.append({
                "name": name,
                "count": stats["count"],
                "rated_count": len(stats["ratings"]),
                "avg_rating": avg_rating,
            })
    actor_ratings.sort(key=lambda x: (x["avg_rating"] or 0, x["count"]), reverse=True)

    # === FINANCIAL (from TMDB) ===
    total_budget = 0
    total_revenue = 0
    budget_distribution = {"indie": 0, "mid": 0, "blockbuster": 0}  # <10M, 10-50M, >50M
    films_with_budget = []
    films_with_roi = []

    for film_id, tmdb in tmdb_films.items():
        film = films.get(film_id)
        if not film:
            continue

        if tmdb.budget and tmdb.budget > 0:
            total_budget += tmdb.budget
            if tmdb.budget < 10_000_000:
                budget_distribution["indie"] += 1
            elif tmdb.budget < 50_000_000:
                budget_distribution["mid"] += 1
            else:
                budget_distribution["blockbuster"] += 1

            films_with_budget.append({
                "title": film.title,
                "year": film.year,
                "poster_url": film.poster_url,
                "budget": tmdb.budget,
                "film_id": film.id,
            })

        if tmdb.revenue and tmdb.revenue > 0:
            total_revenue += tmdb.revenue
            if tmdb.budget and tmdb.budget > 0:
                roi = round((tmdb.revenue / tmdb.budget - 1) * 100, 1)
                films_with_roi.append({
                    "title": film.title,
                    "year": film.year,
                    "poster_url": film.poster_url,
                    "budget": tmdb.budget,
                    "revenue": tmdb.revenue,
                    "roi": roi,
                    "film_id": film.id,
                })

    top_budget = sorted(films_with_budget, key=lambda x: x["budget"], reverse=True)[:10]
    best_roi = sorted(films_with_roi, key=lambda x: x["roi"], reverse=True)[:10]

    # === CERTIFICATION BREAKDOWN ===
    cert_counts = Counter()
    for tmdb in tmdb_films.values():
        if tmdb.certification:
            cert_counts[tmdb.certification] += 1

    certification_breakdown = [
        {"certification": cert, "count": count}
        for cert, count in cert_counts.most_common()
    ]

    # === KEYWORDS WITH RATINGS ===
    keyword_stats = {}  # keyword -> {count, ratings: []}
    for film_id, tmdb in tmdb_films.items():
        if not tmdb.keywords_json:
            continue
        uf = user_films_by_id.get(film_id)
        for kw in tmdb.keywords_json[:10]:  # Top 10 keywords per film
            name = kw.get("name") if isinstance(kw, dict) else None
            if not name:
                continue
            if name not in keyword_stats:
                keyword_stats[name] = {"count": 0, "ratings": []}
            keyword_stats[name]["count"] += 1
            if uf and uf.rating:
                keyword_stats[name]["ratings"].append(uf.rating)

    # Calculate avg rating per keyword (min 3 rated films)
    keyword_ratings = []
    for name, stats in keyword_stats.items():
        if len(stats["ratings"]) >= 3:
            avg = round(sum(stats["ratings"]) / len(stats["ratings"]), 2)
            keyword_ratings.append({
                "keyword": name,
                "count": stats["count"],
                "rated_count": len(stats["ratings"]),
                "avg_rating": avg,
            })

    # Sort by avg rating
    keyword_ratings.sort(key=lambda x: x["avg_rating"], reverse=True)

    # Also keep simple frequency list for display
    top_keywords = [
        {"keyword": kw, "count": count}
        for kw, count in Counter({k: v["count"] for k, v in keyword_stats.items()}).most_common(25)
    ]

    # === RATING TRENDS OVER TIME ===
    rating_by_year = {}  # year_watched -> {ratings: [], count: 0}
    for uf in user_films:
        if not uf.first_watched or not uf.rating:
            continue
        year = uf.first_watched.year
        if year not in rating_by_year:
            rating_by_year[year] = {"ratings": [], "count": 0}
        rating_by_year[year]["ratings"].append(uf.rating)
        rating_by_year[year]["count"] += 1

    rating_trends = []
    for year in sorted(rating_by_year.keys()):
        stats = rating_by_year[year]
        if stats["count"] >= 5:  # Only years with 5+ rated films
            avg = round(sum(stats["ratings"]) / len(stats["ratings"]), 2)
            rating_trends.append({
                "year": year,
                "avg_rating": avg,
                "count": stats["count"],
            })

    # === DECADE PREFERENCES (by release decade) ===
    rating_by_decade = {}
    for uf in user_films:
        film = films.get(uf.film_id)
        if not film or not film.year or not uf.rating:
            continue
        decade = (film.year // 10) * 10
        decade_label = f"{decade}s"
        if decade_label not in rating_by_decade:
            rating_by_decade[decade_label] = {"ratings": [], "count": 0, "decade": decade}
        rating_by_decade[decade_label]["ratings"].append(uf.rating)
        rating_by_decade[decade_label]["count"] += 1

    decade_ratings = []
    for label, stats in rating_by_decade.items():
        if stats["count"] >= 3:  # Only decades with 3+ rated films
            avg = round(sum(stats["ratings"]) / len(stats["ratings"]), 2)
            decade_ratings.append({
                "decade": label,
                "avg_rating": avg,
                "count": stats["count"],
                "sort_key": stats["decade"],
            })
    decade_ratings.sort(key=lambda x: x["sort_key"])

    # === FRANCHISE/COLLECTION TRACKER ===
    collection_stats = {}
    for film_id, tmdb in tmdb_films.items():
        if not tmdb.collection_name:
            continue
        uf = user_films_by_id.get(film_id)
        film = films.get(film_id)
        if not film:
            continue

        coll_name = tmdb.collection_name
        if coll_name not in collection_stats:
            collection_stats[coll_name] = {
                "ratings": [],
                "count": 0,
                "films": [],
                "poster": tmdb.collection_poster_path,
            }
        collection_stats[coll_name]["count"] += 1
        collection_stats[coll_name]["films"].append({
            "title": film.title,
            "year": film.year,
            "rating": uf.rating if uf else None,
        })
        if uf and uf.rating:
            collection_stats[coll_name]["ratings"].append(uf.rating)

    collections = []
    for name, stats in collection_stats.items():
        if stats["count"] >= 2:  # Only collections with 2+ films watched
            avg = round(sum(stats["ratings"]) / len(stats["ratings"]), 2) if stats["ratings"] else None
            collections.append({
                "name": name,
                "count": stats["count"],
                "avg_rating": avg,
                "films": sorted(stats["films"], key=lambda x: x["year"] or 0),
            })
    collections.sort(key=lambda x: x["count"], reverse=True)

    return {
        "rating_stats": {
            "avg_user_rating": round(avg_user, 2),
            "avg_letterboxd_rating": round(avg_lb, 2),
            "avg_gap": round(avg_gap, 2),
            "personality": personality,
            "total_rated": len(rated_films),
        },
        "underrated_by_letterboxd": underrated,
        "overrated_by_letterboxd": overrated,
        "genre_ratings": genre_ratings,
        "director_ratings": director_ratings[:20],
        "actor_ratings": actor_ratings[:20],
        "financial": {
            "total_budget": total_budget,
            "total_revenue": total_revenue,
            "budget_distribution": [
                {"category": "Indie (<$10M)", "count": budget_distribution["indie"]},
                {"category": "Mid ($10-50M)", "count": budget_distribution["mid"]},
                {"category": "Blockbuster (>$50M)", "count": budget_distribution["blockbuster"]},
            ],
            "top_budget": top_budget,
            "best_roi": best_roi,
        },
        "certification_breakdown": certification_breakdown,
        "top_keywords": top_keywords,
        "keyword_ratings": {
            "best": keyword_ratings[:15],
            "worst": list(reversed(keyword_ratings[-15:])) if len(keyword_ratings) > 15 else [],
        },
        "rating_trends": rating_trends,
        "decade_ratings": decade_ratings,
        "collections": collections[:15],
    }


@app.get("/api/insights/tmdb")
def get_tmdb_insights(db: Session = Depends(get_db)):
    """Get insights based on TMDB enrichment data."""
    from sqlalchemy.orm import joinedload

    # Get all watched films with TMDB data
    user_films = db.query(UserFilm).filter(UserFilm.watched == True).all()
    watched_film_ids = {uf.film_id for uf in user_films}

    tmdb_films = db.query(TmdbFilm).filter(TmdbFilm.film_id.in_(watched_film_ids)).all()
    films = {f.id: f for f in db.query(Film).filter(Film.id.in_(watched_film_ids)).all()}

    # Build lookup
    tmdb_by_film_id = {t.film_id: t for t in tmdb_films}

    # === Financial Analysis ===
    films_with_budget = []
    films_with_revenue = []
    total_budget_watched = 0
    total_revenue_watched = 0

    for tmdb in tmdb_films:
        film = films.get(tmdb.film_id)
        if not film:
            continue

        if tmdb.budget and tmdb.budget > 0:
            films_with_budget.append({
                "title": film.title,
                "year": film.year,
                "budget": tmdb.budget,
                "poster_url": film.poster_url,
            })
            total_budget_watched += tmdb.budget

        if tmdb.revenue and tmdb.revenue > 0:
            films_with_revenue.append({
                "title": film.title,
                "year": film.year,
                "revenue": tmdb.revenue,
                "budget": tmdb.budget,
                "roi": round((tmdb.revenue - (tmdb.budget or 0)) / tmdb.budget * 100, 1) if tmdb.budget else None,
                "poster_url": film.poster_url,
            })
            total_revenue_watched += tmdb.revenue

    avg_budget = round(total_budget_watched / len(films_with_budget)) if films_with_budget else 0
    avg_revenue = round(total_revenue_watched / len(films_with_revenue)) if films_with_revenue else 0

    # Top budget films
    top_budget = sorted(films_with_budget, key=lambda x: x["budget"], reverse=True)[:10]
    lowest_budget = sorted([f for f in films_with_budget if f["budget"] > 0], key=lambda x: x["budget"])[:10]

    # Best ROI films
    films_with_roi = [f for f in films_with_revenue if f["roi"] is not None]
    best_roi = sorted(films_with_roi, key=lambda x: x["roi"], reverse=True)[:10]

    # === Certification Breakdown ===
    cert_counter = Counter()
    for tmdb in tmdb_films:
        if tmdb.certification:
            cert_counter[tmdb.certification] += 1
    certification_breakdown = [
        {"certification": cert, "count": count}
        for cert, count in cert_counter.most_common()
    ]

    # === Keywords/Themes Analysis ===
    keyword_counter = Counter()
    for tmdb in tmdb_films:
        if tmdb.keywords_json:
            for kw in tmdb.keywords_json:
                name = kw.get("name") if isinstance(kw, dict) else str(kw)
                if name:
                    keyword_counter[name] += 1
    top_keywords = [
        {"keyword": kw, "count": count}
        for kw, count in keyword_counter.most_common(30)
    ]

    # === TMDB vs Letterboxd Ratings ===
    rating_comparison = []
    for tmdb in tmdb_films:
        film = films.get(tmdb.film_id)
        if film and tmdb.vote_average and film.rating:
            # Convert TMDB (0-10) to same scale as Letterboxd (0-5)
            tmdb_scaled = tmdb.vote_average / 2
            gap = film.rating - tmdb_scaled
            rating_comparison.append({
                "title": film.title,
                "year": film.year,
                "letterboxd_rating": round(film.rating, 2),
                "tmdb_rating": round(tmdb.vote_average, 1),
                "tmdb_rating_scaled": round(tmdb_scaled, 2),
                "gap": round(gap, 2),
                "poster_url": film.poster_url,
            })

    # Films rated higher on Letterboxd vs TMDB
    letterboxd_favorites = sorted(
        [f for f in rating_comparison if f["gap"] > 0.3],
        key=lambda x: x["gap"],
        reverse=True
    )[:10]

    # Films rated higher on TMDB vs Letterboxd
    tmdb_favorites = sorted(
        [f for f in rating_comparison if f["gap"] < -0.3],
        key=lambda x: x["gap"]
    )[:10]

    # === Collection/Franchise Stats ===
    collection_counter = Counter()
    collection_films = {}
    for tmdb in tmdb_films:
        if tmdb.collection_name:
            collection_counter[tmdb.collection_name] += 1
            if tmdb.collection_name not in collection_films:
                collection_films[tmdb.collection_name] = []
            film = films.get(tmdb.film_id)
            if film:
                collection_films[tmdb.collection_name].append(film.title)

    top_collections = [
        {"collection": name, "count": count, "films": collection_films.get(name, [])}
        for name, count in collection_counter.most_common(10)
    ]

    # === Streaming Availability (for watchlist) ===
    watchlist_items = db.query(WatchlistItem).all()
    watchlist_film_ids = {w.film_id for w in watchlist_items}
    watchlist_tmdb = db.query(TmdbFilm).filter(TmdbFilm.film_id.in_(watchlist_film_ids)).all()

    streaming_counter = Counter()
    streaming_films = {}
    for tmdb in watchlist_tmdb:
        if tmdb.watch_providers_json:
            us_providers = tmdb.watch_providers_json.get("US", {})
            for provider in us_providers.get("flatrate", []):
                name = provider.get("name")
                if name:
                    streaming_counter[name] += 1
                    if name not in streaming_films:
                        streaming_films[name] = []
                    film = films.get(tmdb.film_id)
                    if film:
                        streaming_films[name].append({
                            "title": film.title,
                            "year": film.year,
                            "poster_url": film.poster_url,
                        })

    watchlist_streaming = [
        {"provider": name, "count": count, "films": streaming_films.get(name, [])[:5]}
        for name, count in streaming_counter.most_common(10)
    ]

    return {
        "enrichment_stats": {
            "total_watched": len(user_films),
            "films_enriched": len(tmdb_films),
            "enrichment_percentage": round(len(tmdb_films) / len(user_films) * 100, 1) if user_films else 0,
        },
        "financial": {
            "films_with_budget": len(films_with_budget),
            "films_with_revenue": len(films_with_revenue),
            "total_budget_watched": total_budget_watched,
            "total_revenue_watched": total_revenue_watched,
            "avg_budget": avg_budget,
            "avg_revenue": avg_revenue,
            "top_budget": top_budget,
            "lowest_budget": lowest_budget,
            "best_roi": best_roi,
        },
        "certification_breakdown": certification_breakdown,
        "top_keywords": top_keywords,
        "rating_comparison": {
            "letterboxd_favorites": letterboxd_favorites,
            "tmdb_favorites": tmdb_favorites,
        },
        "top_collections": top_collections,
        "watchlist_streaming": watchlist_streaming,
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


@app.get("/api/films/explorer")
def get_films_explorer(
    search: Optional[str] = None,
    sort: str = "title",
    order: str = "asc",
    page: int = 1,
    per_page: int = 20,
    has_tmdb: Optional[bool] = None,
    certification: Optional[str] = None,
    min_budget: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """Get films with full Letterboxd + TMDB data for exploration.

    Returns paginated results with complete raw data for each film.
    """
    # Get all data
    user_films = db.query(UserFilm).filter(UserFilm.watched == True).all()
    films = {f.id: f for f in db.query(Film).all()}
    tmdb_data = {t.film_id: t for t in db.query(TmdbFilm).all()}

    result = []
    for uf in user_films:
        film = films.get(uf.film_id)
        if not film:
            continue

        tmdb = tmdb_data.get(film.id)

        # Filters
        if search:
            if search.lower() not in (film.title or "").lower():
                continue

        if has_tmdb is not None:
            if has_tmdb and not tmdb:
                continue
            if not has_tmdb and tmdb:
                continue

        if certification and tmdb:
            if tmdb.certification != certification:
                continue

        if min_budget and tmdb:
            if not tmdb.budget or tmdb.budget < min_budget:
                continue

        # Build complete data object
        film_data = {
            "id": film.id,
            "slug": film.slug,
            "title": film.title,
            "year": film.year,
            "poster_url": film.poster_url,

            # User data
            "user": {
                "rating": uf.rating,
                "liked": uf.liked,
                "watch_count": uf.watch_count or 0,
                "first_watched": uf.first_watched.isoformat() if uf.first_watched else None,
                "last_watched": uf.last_watched.isoformat() if uf.last_watched else None,
            },

            # Letterboxd data
            "letterboxd": {
                "rating": film.rating,
                "rating_count": film.rating_count,
                "runtime_minutes": film.runtime_minutes,
                "tagline": film.tagline,
                "description": film.description,
                "genres": film.genres_json,
                "directors": film.directors_json,
                "cast": film.cast_json,
                "crew": film.crew_json,
                "countries": film.countries_json,
                "languages": film.languages_json,
                "studios": film.studios_json,
                "url": film.letterboxd_url,
                "tmdb_id": film.tmdb_id,
                "imdb_id": film.imdb_id,
            },

            # TMDB data (if available)
            "tmdb": None,
        }

        if tmdb:
            film_data["tmdb"] = {
                "budget": tmdb.budget,
                "revenue": tmdb.revenue,
                "vote_average": tmdb.vote_average,
                "vote_count": tmdb.vote_count,
                "popularity": tmdb.popularity,
                "certification": tmdb.certification,
                "certifications": tmdb.certifications_json,
                "adult": tmdb.adult,
                "status": tmdb.status,
                "release_date": tmdb.release_date,
                "homepage": tmdb.homepage,
                "origin_country": tmdb.origin_country_json,
                "collection": {
                    "id": tmdb.collection_id,
                    "name": tmdb.collection_name,
                    "poster_path": tmdb.collection_poster_path,
                } if tmdb.collection_id else None,
                "keywords": tmdb.keywords_json,
                "watch_providers": tmdb.watch_providers_json,
                "similar": tmdb.similar_json,
                "recommendations": tmdb.recommendations_json,
                "videos": tmdb.videos_json,
                "cast": tmdb.cast_json,
                "crew": tmdb.crew_json,
                "production_companies": tmdb.production_companies_json,
                "external_ids": {
                    "imdb": tmdb.imdb_id,
                    "wikidata": tmdb.wikidata_id,
                    "facebook": tmdb.facebook_id,
                    "instagram": tmdb.instagram_id,
                    "twitter": tmdb.twitter_id,
                },
                "last_synced": tmdb.last_synced_at.isoformat() if tmdb.last_synced_at else None,
            }

        result.append(film_data)

    # Sort
    reverse = order == "desc"
    if sort == "title":
        result.sort(key=lambda x: x["title"] or "", reverse=reverse)
    elif sort == "year":
        result.sort(key=lambda x: x["year"] or 0, reverse=reverse)
    elif sort == "rating":
        result.sort(key=lambda x: x["user"]["rating"] or 0, reverse=reverse)
    elif sort == "budget":
        result.sort(key=lambda x: (x["tmdb"] or {}).get("budget") or 0, reverse=reverse)
    elif sort == "revenue":
        result.sort(key=lambda x: (x["tmdb"] or {}).get("revenue") or 0, reverse=reverse)
    elif sort == "tmdb_rating":
        result.sort(key=lambda x: (x["tmdb"] or {}).get("vote_average") or 0, reverse=reverse)

    # Pagination
    total = len(result)
    start = (page - 1) * per_page
    end = start + per_page
    paginated = result[start:end]

    return {
        "count": total,
        "page": page,
        "per_page": per_page,
        "total_pages": (total + per_page - 1) // per_page,
        "films": paginated,
    }


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

    # Get TMDB enrichment data
    tmdb_data = db.query(TmdbFilm).filter(TmdbFilm.film_id == film_id).first()

    result = {
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

    # Add TMDB data if available
    if tmdb_data:
        result["tmdb"] = {
            "budget": tmdb_data.budget,
            "revenue": tmdb_data.revenue,
            "vote_average": tmdb_data.vote_average,
            "vote_count": tmdb_data.vote_count,
            "popularity": tmdb_data.popularity,
            "certification": tmdb_data.certification,
            "status": tmdb_data.status,
            "release_date": tmdb_data.release_date,
            "homepage": tmdb_data.homepage,
            "collection": {
                "id": tmdb_data.collection_id,
                "name": tmdb_data.collection_name,
                "poster_path": tmdb_data.collection_poster_path,
            } if tmdb_data.collection_id else None,
            "keywords": [kw.get("name") for kw in (tmdb_data.keywords_json or [])],
            "watch_providers": tmdb_data.watch_providers_json,
            "videos": tmdb_data.videos_json,
            "similar": tmdb_data.similar_json,
            "recommendations": tmdb_data.recommendations_json,
            "external_ids": {
                "imdb": tmdb_data.imdb_id,
                "wikidata": tmdb_data.wikidata_id,
                "facebook": tmdb_data.facebook_id,
                "instagram": tmdb_data.instagram_id,
                "twitter": tmdb_data.twitter_id,
            },
            "last_synced": tmdb_data.last_synced_at.isoformat() if tmdb_data.last_synced_at else None,
        }

    return result


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
    """Get user's watchlist with streaming availability."""
    watchlist_items = db.query(WatchlistItem).all()
    watchlist_film_ids = [w.film_id for w in watchlist_items]

    films = {f.id: f for f in db.query(Film).filter(Film.id.in_(watchlist_film_ids)).all()}
    tmdb_data = {t.film_id: t for t in db.query(TmdbFilm).filter(TmdbFilm.film_id.in_(watchlist_film_ids)).all()}

    result = []
    for item in watchlist_items:
        film = films.get(item.film_id)
        if film:
            tmdb = tmdb_data.get(item.film_id)

            # Extract streaming services (US flatrate only)
            streaming = []
            if tmdb and tmdb.watch_providers_json:
                us_providers = tmdb.watch_providers_json.get("US", {})
                for provider in us_providers.get("flatrate", []):
                    streaming.append(provider.get("provider_name"))

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
                "streaming": streaming,
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
