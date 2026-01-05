import { useState } from 'react';
import {
  Card,
  Title,
  Text,
  Metric,
  Flex,
  ProgressBar,
  BarChart,
  DonutChart,
  LineChart,
  Grid,
} from '@tremor/react';
import { Link } from 'react-router-dom';
import { useInsights } from '../hooks/useApi';

function formatCurrency(num: number): string {
  if (num >= 1_000_000_000) return `$${(num / 1_000_000_000).toFixed(1)}B`;
  if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(0)}M`;
  if (num >= 1_000) return `$${(num / 1_000).toFixed(0)}K`;
  return `$${num}`;
}

function LegendModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-ink/50 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-white border border-cream-200 rounded-xl p-6 max-w-md mx-4 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-display font-semibold text-[var(--text-primary)] mb-4">Rating Personality Legend</h3>
        <div className="space-y-4">
          <div>
            <p className="text-[var(--text-muted)] text-xs uppercase tracking-wide mb-2">Personality Types</p>
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <span className="w-3 h-3 rounded-full bg-rust"></span>
                <span className="text-rust font-medium">The Tough Critic</span>
                <span className="text-[var(--text-muted)] text-sm">(&lt; -0.3)</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="w-3 h-3 rounded-full bg-ink"></span>
                <span className="text-ink font-medium">The Balanced Judge</span>
                <span className="text-[var(--text-muted)] text-sm">(-0.3 to +0.3)</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="w-3 h-3 rounded-full bg-sage"></span>
                <span className="text-sage font-medium">The Generous Viewer</span>
                <span className="text-[var(--text-muted)] text-sm">(&gt; +0.3)</span>
              </div>
            </div>
          </div>
          <div className="pt-4 border-t border-cream-200">
            <p className="text-[var(--text-muted)] text-sm">
              The gap is calculated as your average rating minus the Letterboxd community average.
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="mt-6 w-full py-2 bg-cream-100 hover:bg-cream-200 text-[var(--text-primary)] rounded-lg transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  );
}

interface RatedFilm {
  title: string;
  year: number;
  poster_url?: string;
  user_rating: number;
  letterboxd_rating: number;
  gap: number;
  film_id: number;
}

function FilmTable({ films, gapColor }: { films: RatedFilm[]; gapColor: string }) {
  return (
    <div className="mt-4 overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-cream-200">
            <th className="text-left py-2 px-3 text-[var(--text-muted)] font-medium">Title</th>
            <th className="text-center py-2 px-3 text-[var(--text-muted)] font-medium">Year</th>
            <th className="text-center py-2 px-3 text-[var(--text-muted)] font-medium">You</th>
            <th className="text-center py-2 px-3 text-[var(--text-muted)] font-medium">LB</th>
            <th className="text-center py-2 px-3 text-[var(--text-muted)] font-medium">Gap</th>
          </tr>
        </thead>
        <tbody>
          {films.map((film) => (
            <tr key={film.film_id} className="border-b border-cream-100 hover:bg-cream-50">
              <td className="py-2 px-3">
                <Link to={`/films/${film.film_id}`} className="text-[var(--text-primary)] hover:text-rust transition-colors">
                  {film.title}
                </Link>
              </td>
              <td className="text-center py-2 px-3 text-[var(--text-muted)]">{film.year}</td>
              <td className="text-center py-2 px-3 text-[var(--text-primary)] font-mono">{film.user_rating}</td>
              <td className="text-center py-2 px-3 text-[var(--text-muted)] font-mono">{film.letterboxd_rating}</td>
              <td className={`text-center py-2 px-3 font-mono font-medium ${gapColor}`}>
                {film.gap > 0 ? '+' : ''}{film.gap.toFixed(1)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function Insights() {
  const { data, loading } = useInsights();
  const [showAllGems, setShowAllGems] = useState(false);
  const [showAllUnpopular, setShowAllUnpopular] = useState(false);
  const [showLegend, setShowLegend] = useState(false);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-[var(--text-muted)]">Analyzing your taste...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <Text className="text-[var(--text-muted)]">Failed to load insights</Text>
      </div>
    );
  }

  const {
    rating_stats,
    underrated_by_letterboxd,
    overrated_by_letterboxd,
    genre_ratings,
    director_ratings,
    actor_ratings,
    financial,
    certification_breakdown,
    keyword_ratings,
    rating_trends,
    decade_ratings,
    collections,
  } = data;

  const personalities: Record<string, { title: string; description: string; color: string }> = {
    harsh: {
      title: 'The Tough Critic',
      description: 'You hold films to a higher standard than most.',
      color: 'text-rust',
    },
    generous: {
      title: 'The Generous Viewer',
      description: 'You tend to find more joy in films than the average viewer.',
      color: 'text-sage',
    },
    balanced: {
      title: 'The Balanced Judge',
      description: 'Your ratings align closely with the Letterboxd community.',
      color: 'text-ink',
    },
  };

  const personality = personalities[rating_stats.personality] || personalities.balanced;
  const progressValue = Math.max(0, Math.min(100, 50 + (rating_stats.avg_gap * 25)));

  const topGems = underrated_by_letterboxd?.slice(0, 5) || [];
  const topUnpopular = overrated_by_letterboxd?.slice(0, 5) || [];

  const genreChartData = (genre_ratings || [])
    .filter((g: any) => g.rated_count >= 5 && g.avg_rating)
    .slice(0, 10)
    .map((g: any) => ({
      name: g.name,
      "Avg Rating": g.avg_rating,
      "Films": g.count,
    }));

  const directorChartData = (director_ratings || [])
    .filter((d: any) => d.avg_rating)
    .slice(0, 10)
    .map((d: any) => ({
      name: `${d.name} (${d.count})`,
      "Avg Rating": d.avg_rating,
    }));

  const actorChartData = (actor_ratings || [])
    .filter((a: any) => a.avg_rating)
    .slice(0, 10)
    .map((a: any) => ({
      name: `${a.name} (${a.count})`,
      "Avg Rating": a.avg_rating,
    }));

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-3xl font-display font-semibold text-[var(--text-primary)] mb-2">Insights</h1>
        <p className="text-[var(--text-muted)]">
          What you <span className="text-sage font-medium">like</span> — not just what you watch
        </p>
      </div>

      <Card className="bg-white border-cream-200 ring-0 shadow-sm">
        <Title className="text-[var(--text-primary)] font-display">Your Rating Personality</Title>
        <div className="mt-6 text-center">
          <Metric className={personality.color}>{personality.title}</Metric>
          <Text className="text-[var(--text-muted)] mt-2">{personality.description}</Text>

          <div className="mt-6 max-w-md mx-auto">
            <Flex className="mb-2">
              <Text className="text-rust">Harsh</Text>
              <Text className="text-[var(--text-muted)]">Balanced</Text>
              <Text className="text-sage">Generous</Text>
            </Flex>
            <ProgressBar value={progressValue} color="green" className="h-3" />
          </div>

          <div className="mt-6 grid grid-cols-3 gap-4 max-w-lg mx-auto">
            <div>
              <Text className="text-[var(--text-muted)] text-xs uppercase tracking-wide">Your Average</Text>
              <p className="text-2xl font-mono font-medium text-[var(--text-primary)]">{rating_stats.avg_user_rating}</p>
            </div>
            <div>
              <Text className="text-[var(--text-muted)] text-xs uppercase tracking-wide">Difference</Text>
              <p className={`text-2xl font-mono font-medium ${rating_stats.avg_gap >= 0 ? 'text-sage' : 'text-rust'}`}>
                {rating_stats.avg_gap >= 0 ? '+' : ''}{rating_stats.avg_gap}
              </p>
            </div>
            <div>
              <Text className="text-[var(--text-muted)] text-xs uppercase tracking-wide">LB Average</Text>
              <p className="text-2xl font-mono font-medium text-[var(--text-primary)]">{rating_stats.avg_letterboxd_rating}</p>
            </div>
          </div>

          <Text className="text-[var(--text-muted)] mt-4">
            Based on {rating_stats.total_rated} rated films
          </Text>

          <button
            onClick={() => setShowLegend(true)}
            className="mt-4 text-ink hover:text-rust text-sm transition-colors"
          >
            What does this mean?
          </button>
        </div>
      </Card>

      {showLegend && <LegendModal onClose={() => setShowLegend(false)} />}

      {financial && (
        <div>
          <h2 className="text-2xl font-display font-semibold text-[var(--text-primary)] mb-6">Box Office Power</h2>
          <Grid numItemsMd={2} numItemsLg={4} className="gap-6 mb-6">
            <Card className="bg-white border-cream-200 ring-0 shadow-sm">
              <Text className="text-[var(--text-muted)]">Total Budget Watched</Text>
              <Metric className="text-sage">{formatCurrency(financial.total_budget)}</Metric>
              <Text className="text-[var(--text-muted)] mt-2">Combined production budgets</Text>
            </Card>
            <Card className="bg-white border-cream-200 ring-0 shadow-sm">
              <Text className="text-[var(--text-muted)]">Total Box Office</Text>
              <Metric className="text-gold">{formatCurrency(financial.total_revenue)}</Metric>
              <Text className="text-[var(--text-muted)] mt-2">Combined worldwide revenue</Text>
            </Card>
            <Card className="bg-white border-cream-200 ring-0 shadow-sm col-span-2">
              <Title className="text-[var(--text-primary)]">Budget Distribution</Title>
              <Text className="text-[var(--text-muted)]">What kind of films do you watch?</Text>
              <BarChart
                className="mt-4 h-32"
                data={financial.budget_distribution}
                index="category"
                categories={['count']}
                colors={['green']}
                showLegend={false}
                showGridLines={false}
                yAxisWidth={40}
              />
            </Card>
          </Grid>

          <Grid numItemsMd={2} className="gap-6">
            <Card className="bg-white border-cream-200 ring-0 shadow-sm">
              <Title className="text-[var(--text-primary)]">Biggest Budget Films</Title>
              <Text className="text-[var(--text-muted)]">Most expensive productions you've watched</Text>
              <div className="mt-4 space-y-3">
                {financial.top_budget?.slice(0, 5).map((film: any) => (
                  <div key={film.film_id} className="flex items-center gap-3">
                    <div className="w-10 h-14 bg-cream-100 rounded overflow-hidden flex-shrink-0">
                      {film.poster_url && (
                        <img src={film.poster_url} alt={film.title} className="w-full h-full object-cover" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <Link to={`/films/${film.film_id}`} className="text-[var(--text-primary)] hover:text-sage text-sm truncate block">
                        {film.title}
                      </Link>
                      <Text className="text-[var(--text-muted)] text-xs">{film.year}</Text>
                    </div>
                    <Text className="text-sage font-medium">{formatCurrency(film.budget)}</Text>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="bg-white border-cream-200 ring-0 shadow-sm">
              <Title className="text-[var(--text-primary)]">Best ROI Films</Title>
              <Text className="text-[var(--text-muted)]">Most profitable films you've watched</Text>
              <div className="mt-4 space-y-3">
                {financial.best_roi?.slice(0, 5).map((film: any) => (
                  <div key={film.film_id} className="flex items-center gap-3">
                    <div className="w-10 h-14 bg-cream-100 rounded overflow-hidden flex-shrink-0">
                      {film.poster_url && (
                        <img src={film.poster_url} alt={film.title} className="w-full h-full object-cover" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <Link to={`/films/${film.film_id}`} className="text-[var(--text-primary)] hover:text-sage text-sm truncate block">
                        {film.title}
                      </Link>
                      <Text className="text-[var(--text-muted)] text-xs">{formatCurrency(film.budget)} → {formatCurrency(film.revenue)}</Text>
                    </div>
                    <Text className="text-sage font-bold">+{film.roi}%</Text>
                  </div>
                ))}
              </div>
            </Card>
          </Grid>
        </div>
      )}

      {genreChartData.length > 0 && (
        <Card className="bg-white border-cream-200 ring-0 shadow-sm">
          <Title className="text-[var(--text-primary)]">Your Genre Preferences</Title>
          <Text className="text-[var(--text-muted)]">Average rating by genre (min 5 films)</Text>
          <BarChart
            className="mt-6 h-72"
            data={genreChartData}
            index="name"
            categories={['Avg Rating']}
            colors={['blue']}
            showLegend={false}
            showGridLines={false}
            yAxisWidth={48}
            layout="vertical"
            valueFormatter={(v) => v.toFixed(2)}
          />
        </Card>
      )}

      <Grid numItemsMd={2} className="gap-6">
        {directorChartData.length > 0 && (
          <Card className="bg-white border-cream-200 ring-0 shadow-sm">
            <Title className="text-[var(--text-primary)]">Directors You Rate Highest</Title>
            <Text className="text-[var(--text-muted)]">Average rating (2+ films)</Text>
            <BarChart
              className="mt-4 h-64"
              data={directorChartData}
              index="name"
              categories={['Avg Rating']}
              colors={['rose']}
              showLegend={false}
              showGridLines={false}
              yAxisWidth={48}
              layout="vertical"
              valueFormatter={(v) => v.toFixed(2)}
            />
          </Card>
        )}

        {actorChartData.length > 0 && (
          <Card className="bg-white border-cream-200 ring-0 shadow-sm">
            <Title className="text-[var(--text-primary)]">Actors You Rate Highest</Title>
            <Text className="text-[var(--text-muted)]">Average rating (3+ films)</Text>
            <BarChart
              className="mt-4 h-64"
              data={actorChartData}
              index="name"
              categories={['Avg Rating']}
              colors={['fuchsia']}
              showLegend={false}
              showGridLines={false}
              yAxisWidth={48}
              layout="vertical"
              valueFormatter={(v) => v.toFixed(2)}
            />
          </Card>
        )}
      </Grid>

      <Grid numItemsMd={2} className="gap-6">
        {certification_breakdown && certification_breakdown.length > 0 && (
          <Card className="bg-white border-cream-200 ring-0 shadow-sm">
            <Title className="text-[var(--text-primary)]">Content Ratings</Title>
            <Text className="text-[var(--text-muted)]">Distribution of film certifications</Text>
            <DonutChart
              className="mt-6 h-52"
              data={certification_breakdown}
              category="count"
              index="certification"
              colors={['rose', 'amber', 'emerald', 'cyan', 'violet', 'fuchsia', 'blue']}
              showLabel={true}
              showAnimation={true}
            />
          </Card>
        )}

        {keyword_ratings && (keyword_ratings.best?.length > 0 || keyword_ratings.worst?.length > 0) && (
          <Card className="bg-white border-cream-200 ring-0 shadow-sm">
            <Title className="text-[var(--text-primary)]">Theme Preferences</Title>
            <Text className="text-[var(--text-muted)]">Keywords you rate highest vs lowest (min 3 films)</Text>
            <div className="mt-4 grid grid-cols-2 gap-4">
              <div>
                <Text className="text-sage font-medium mb-2">Themes you love</Text>
                <div className="space-y-1">
                  {keyword_ratings.best?.slice(0, 8).map((kw: any) => (
                    <div key={kw.keyword} className="flex justify-between text-sm">
                      <span className="text-[var(--text-primary)] truncate">{kw.keyword}</span>
                      <span className="text-sage font-medium ml-2">★ {kw.avg_rating}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <Text className="text-rust font-medium mb-2">Themes you dislike</Text>
                <div className="space-y-1">
                  {keyword_ratings.worst?.slice(0, 8).map((kw: any) => (
                    <div key={kw.keyword} className="flex justify-between text-sm">
                      <span className="text-[var(--text-primary)] truncate">{kw.keyword}</span>
                      <span className="text-rust font-medium ml-2">★ {kw.avg_rating}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        )}
      </Grid>

      {rating_trends && rating_trends.length > 1 && (
        <Card className="bg-white border-cream-200 ring-0 shadow-sm">
          <Title className="text-[var(--text-primary)]">Your Rating Trends</Title>
          <Text className="text-[var(--text-muted)]">How your ratings have changed over the years</Text>
          <LineChart
            className="mt-6 h-64"
            data={rating_trends}
            index="year"
            categories={['avg_rating']}
            colors={['green']}
            showLegend={false}
            showGridLines={false}
            yAxisWidth={40}
            valueFormatter={(v) => v.toFixed(2)}
            curveType="monotone"
          />
        </Card>
      )}

      {decade_ratings && decade_ratings.length > 0 && (
        <Card className="bg-white border-cream-200 ring-0 shadow-sm">
          <Title className="text-[var(--text-primary)]">Decade Preferences</Title>
          <Text className="text-[var(--text-muted)]">Which era of cinema do you rate highest?</Text>
          <BarChart
            className="mt-6 h-64"
            data={decade_ratings.map((d: any) => ({ decade: d.decade, "Avg Rating": d.avg_rating, Films: d.count }))}
            index="decade"
            categories={['Avg Rating']}
            colors={['amber']}
            showLegend={false}
            showGridLines={false}
            yAxisWidth={40}
            valueFormatter={(v) => v.toFixed(2)}
          />
        </Card>
      )}

      {collections && collections.length > 0 && (
        <div>
          <h2 className="text-2xl font-display font-semibold text-[var(--text-primary)] mb-2">Your Franchises</h2>
          <p className="text-[var(--text-muted)] mb-6">Collections and series you've explored</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {collections.slice(0, 9).map((coll: any) => (
              <Card key={coll.name} className="bg-white border-cream-200 ring-0 shadow-sm">
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    <Title className="text-[var(--text-primary)] text-base truncate">{coll.name.replace(' Collection', '')}</Title>
                    <Text className="text-[var(--text-muted)]">
                      {coll.count} films watched
                      {coll.avg_rating && ` · Avg ★ ${coll.avg_rating}`}
                    </Text>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-1">
                  {coll.films.slice(0, 5).map((film: any) => (
                    <span
                      key={film.title}
                      className="text-xs px-2 py-0.5 bg-cream-100 text-[var(--text-muted)] rounded"
                      title={`${film.title} (${film.year})${film.rating ? ` - ★${film.rating}` : ''}`}
                    >
                      {film.title.length > 20 ? film.title.slice(0, 20) + '...' : film.title}
                    </span>
                  ))}
                  {coll.films.length > 5 && (
                    <span className="text-xs px-2 py-0.5 text-[var(--text-muted)]">
                      +{coll.films.length - 5} more
                    </span>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {topGems.length > 0 && (
        <div>
          <h2 className="text-2xl font-display font-semibold text-[var(--text-primary)] mb-2">Your Hidden Gems</h2>
          <p className="text-[var(--text-muted)] mb-6">
            {underrated_by_letterboxd.length} films you loved more than most people
          </p>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {topGems.map((film: RatedFilm) => (
              <Link to={`/films/${film.film_id}`} key={film.film_id} className="group">
                <div className="relative">
                  <div className="aspect-[2/3] bg-cream-100 rounded-lg overflow-hidden mb-2">
                    {film.poster_url ? (
                      <img
                        src={film.poster_url}
                        alt={film.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[var(--text-muted)] text-xs text-center p-2">
                        {film.title}
                      </div>
                    )}
                  </div>
                  <div className="absolute top-2 right-2 bg-[#00e054] text-[#14181c] text-xs font-bold px-2 py-1 rounded">
                    +{film.gap.toFixed(1)}
                  </div>
                </div>
                <p className="text-sm text-[var(--text-primary)] truncate">{film.title}</p>
                <p className="text-xs text-[var(--text-muted)]">
                  You: {film.user_rating} vs LB: {film.letterboxd_rating}
                </p>
              </Link>
            ))}
          </div>

          {underrated_by_letterboxd.length > 5 && (
            <div className="mt-4">
              <button
                onClick={() => setShowAllGems(!showAllGems)}
                className="text-sage hover:text-sage-light text-sm font-medium"
              >
                {showAllGems
                  ? 'Hide full list'
                  : `Show all ${underrated_by_letterboxd.length} hidden gems`}
              </button>
              {showAllGems && (
                <FilmTable films={underrated_by_letterboxd} gapColor="text-sage" />
              )}
            </div>
          )}
        </div>
      )}

      {topUnpopular.length > 0 && (
        <div>
          <h2 className="text-2xl font-display font-semibold text-[var(--text-primary)] mb-2">Your Unpopular Opinions</h2>
          <p className="text-[var(--text-muted)] mb-6">
            {overrated_by_letterboxd.length} films others loved more than you
          </p>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {topUnpopular.map((film: RatedFilm) => (
              <Link to={`/films/${film.film_id}`} key={film.film_id} className="group">
                <div className="relative">
                  <div className="aspect-[2/3] bg-cream-100 rounded-lg overflow-hidden mb-2">
                    {film.poster_url ? (
                      <img
                        src={film.poster_url}
                        alt={film.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[var(--text-muted)] text-xs text-center p-2">
                        {film.title}
                      </div>
                    )}
                  </div>
                  <div className="absolute top-2 right-2 bg-[#ff8000] text-[#14181c] text-xs font-bold px-2 py-1 rounded">
                    {film.gap.toFixed(1)}
                  </div>
                </div>
                <p className="text-sm text-[var(--text-primary)] truncate">{film.title}</p>
                <p className="text-xs text-[var(--text-muted)]">
                  You: {film.user_rating} vs LB: {film.letterboxd_rating}
                </p>
              </Link>
            ))}
          </div>

          {overrated_by_letterboxd.length > 5 && (
            <div className="mt-4">
              <button
                onClick={() => setShowAllUnpopular(!showAllUnpopular)}
                className="text-rust hover:text-rust-light text-sm font-medium"
              >
                {showAllUnpopular
                  ? 'Hide full list'
                  : `Show all ${overrated_by_letterboxd.length} unpopular opinions`}
              </button>
              {showAllUnpopular && (
                <FilmTable films={overrated_by_letterboxd} gapColor="text-rust" />
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
