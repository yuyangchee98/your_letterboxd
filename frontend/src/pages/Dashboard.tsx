import {
  Card,
  Title,
  Text,
  Metric,
  Flex,
  ProgressBar,
  Grid,
  BarChart,
  DonutChart,
  AreaChart,
} from '@tremor/react';
import { useDashboardStats } from '../hooks/useApi';
import CalendarHeatmap from '../components/CalendarHeatmap';

export default function Dashboard() {
  const { data, loading, error } = useDashboardStats();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-[var(--text-muted)]">Loading your stats...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="text-center py-12">
        <Text className="text-[var(--text-muted)]">Failed to load dashboard data</Text>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      <div>
        <div className="mb-8">
          <h2 className="text-3xl font-display font-semibold text-[var(--text-primary)]">Overview</h2>
          <p className="text-[var(--text-muted)] mt-1">What you watch — see <a href="/insights" className="text-sage hover:text-rust transition-colors">Insights</a> for what you like</p>
        </div>
        <Grid numItemsMd={2} numItemsLg={4} className="gap-5">
          <Card className="bg-white border-cream-200 ring-0 shadow-sm">
            <Text className="text-[var(--text-muted)]">Films Watched</Text>
            <Metric className="text-[var(--text-primary)] font-mono">{data.total_films}</Metric>
            <Flex className="mt-4">
              <Text className="text-sage font-medium">{data.films_this_year} this year</Text>
            </Flex>
          </Card>

          <Card className="bg-white border-cream-200 ring-0 shadow-sm">
            <Text className="text-[var(--text-muted)]">Hours Watched</Text>
            <Metric className="text-[var(--text-primary)] font-mono">{data.total_hours.toLocaleString()}</Metric>
            <Flex className="mt-4">
              <Text className="text-[var(--text-muted)]">{Math.round(data.total_hours / 24)} days of film</Text>
            </Flex>
          </Card>

          <Card className="bg-white border-cream-200 ring-0 shadow-sm">
            <Text className="text-[var(--text-muted)]">Your Average Rating</Text>
            <Metric className="text-[var(--text-primary)] font-mono">{data.avg_rating.toFixed(1)}</Metric>
            <Flex className="mt-4 gap-2">
              <Text className="text-[var(--text-muted)]">vs</Text>
              <Text className="text-ink">{data.letterboxd_avg.toFixed(1)} Letterboxd avg</Text>
            </Flex>
          </Card>

          <Card className="bg-white border-cream-200 ring-0 shadow-sm">
            <Text className="text-[var(--text-muted)]">This Month</Text>
            <Metric className="text-[var(--text-primary)] font-mono">{data.films_this_month}</Metric>
            <Flex className="mt-4">
              <Text className="text-[var(--text-muted)]">films watched</Text>
            </Flex>
          </Card>
        </Grid>

        <Grid numItemsMd={2} numItemsLg={4} className="gap-5 mt-5">
          <Card className="bg-white border-cream-200 ring-0 shadow-sm">
            <Text className="text-[var(--text-muted)]">Average Runtime</Text>
            <Metric className="text-[var(--text-primary)] font-mono">{data.runtime_stats?.avg_runtime || 0} min</Metric>
            <Flex className="mt-4">
              <Text className="text-[var(--text-muted)]">{Math.round((data.runtime_stats?.avg_runtime || 0) / 60 * 10) / 10}h per film</Text>
            </Flex>
          </Card>

          <Card className="bg-white border-cream-200 ring-0 shadow-sm">
            <Text className="text-[var(--text-muted)]">Rewatches</Text>
            <Metric className="text-[var(--text-primary)] font-mono">{data.total_rewatches || 0}</Metric>
            <Flex className="mt-4">
              <Text className="text-[var(--text-muted)]">films seen again</Text>
            </Flex>
          </Card>

          <Card className="bg-white border-cream-200 ring-0 shadow-sm">
            <Text className="text-[var(--text-muted)]">Liked Films</Text>
            <Metric className="text-[var(--text-primary)] font-mono">{data.total_liked || 0}</Metric>
            <Flex className="mt-4">
              <Text className="text-rust">♥ favorites</Text>
            </Flex>
          </Card>

          <Card className="bg-white border-cream-200 ring-0 shadow-sm">
            <Text className="text-[var(--text-muted)]">Logged vs Unlogged</Text>
            <Metric className="text-[var(--text-primary)] font-mono">{data.total_logged || 0}</Metric>
            <Flex className="mt-4">
              <Text className="text-[var(--text-muted)]">{data.total_unlogged || 0} unlogged watches</Text>
            </Flex>
          </Card>
        </Grid>
      </div>

      <div>
        <h2 className="text-2xl font-display font-semibold text-[var(--text-primary)] mb-6">Watching Patterns</h2>
        <Grid numItemsMd={3} className="gap-5">
          <Card className="bg-white border-cream-200 ring-0 shadow-sm">
            <Text className="text-[var(--text-muted)]">Binge Days</Text>
            <Metric className="text-[var(--text-primary)] font-mono">{data.binge_days || 0}</Metric>
            <Flex className="mt-4">
              <Text className="text-[var(--text-muted)]">days with 2+ films</Text>
            </Flex>
          </Card>

          <Card className="bg-white border-cream-200 ring-0 shadow-sm">
            <Text className="text-[var(--text-muted)]">Longest Streak</Text>
            <Metric className="text-[var(--text-primary)] font-mono">{data.longest_streak || 0}</Metric>
            <Flex className="mt-4">
              <Text className="text-[var(--text-muted)]">consecutive days</Text>
            </Flex>
          </Card>

          <Card className="bg-white border-cream-200 ring-0 shadow-sm">
            <Text className="text-[var(--text-muted)]">Most in One Day</Text>
            <Metric className="text-[var(--text-primary)] font-mono">{data.max_in_one_day || 0}</Metric>
            <Flex className="mt-4">
              <Text className="text-[var(--text-muted)]">films watched</Text>
            </Flex>
          </Card>
        </Grid>
      </div>

      <div>
        <h2 className="text-2xl font-display font-semibold text-[var(--text-primary)] mb-6">Watch Activity</h2>
        <Card className="bg-white border-cream-200 ring-0 shadow-sm">
          <CalendarHeatmap />
        </Card>
      </div>

      {data.day_of_week && data.day_of_week.length > 0 && (
        <Card className="bg-white border-cream-200 ring-0 shadow-sm">
          <Title className="text-[var(--text-primary)] font-display">When You Watch</Title>
          <Text className="text-[var(--text-muted)]">Films watched by day of week</Text>
          <BarChart
            className="mt-6 h-48"
            data={data.day_of_week}
            index="day"
            categories={['count']}
            colors={['rose']}
            showLegend={false}
            showGridLines={false}
            yAxisWidth={40}
          />
        </Card>
      )}

      <Grid numItemsMd={2} className="gap-5">
        <Card className="bg-white border-cream-200 ring-0 shadow-sm">
          <Title className="text-[var(--text-primary)] font-display">Your Ratings</Title>
          <Text className="text-[var(--text-muted)]">Distribution of your ratings</Text>
          <BarChart
            className="mt-6 h-60"
            data={data.rating_distribution}
            index="rating"
            categories={['count']}
            colors={['green']}
            showLegend={false}
            showGridLines={false}
            yAxisWidth={40}
          />
        </Card>

        <Card className="bg-white border-cream-200 ring-0 shadow-sm">
          <Title className="text-[var(--text-primary)] font-display">Films Over Time</Title>
          <Text className="text-[var(--text-muted)]">Monthly watch count</Text>
          <AreaChart
            className="mt-6 h-60"
            data={data.films_by_month}
            index="month"
            categories={['count']}
            colors={['blue']}
            showLegend={false}
            showGridLines={false}
            yAxisWidth={40}
          />
        </Card>
      </Grid>

      {data.films_by_year && data.films_by_year.length > 0 && (
        <Card className="bg-white border-cream-200 ring-0 shadow-sm">
          <Title className="text-[var(--text-primary)] font-display">Films by Year</Title>
          <Text className="text-[var(--text-muted)]">Your watching journey over the years</Text>
          <BarChart
            className="mt-6 h-60"
            data={data.films_by_year}
            index="year"
            categories={['count']}
            colors={['rose']}
            showLegend={false}
            showGridLines={false}
            yAxisWidth={40}
          />
        </Card>
      )}

      <Grid numItemsMd={2} numItemsLg={4} className="gap-5">
        <Card className="bg-white border-cream-200 ring-0 shadow-sm">
          <Title className="text-[var(--text-primary)] font-display">Top Genres</Title>
          <div className="mt-4 space-y-3">
            {data.top_genres.slice(0, 8).map((genre) => (
              <div key={genre.name}>
                <Flex>
                  <Text className="text-[var(--text-body)]">{genre.name}</Text>
                  <Text className="text-[var(--text-muted)]">{genre.count}</Text>
                </Flex>
                <ProgressBar
                  value={(genre.count / data.top_genres[0].count) * 100}
                  color="green"
                  className="mt-1"
                />
              </div>
            ))}
          </div>
        </Card>

        <Card className="bg-white border-cream-200 ring-0 shadow-sm">
          <Title className="text-[var(--text-primary)] font-display">Top Directors</Title>
          <div className="mt-4 space-y-3">
            {data.top_directors.slice(0, 8).map((director) => (
              <div key={director.name}>
                <Flex>
                  <Text className="text-[var(--text-body)]">{director.name}</Text>
                  <Text className="text-[var(--text-muted)]">{director.count}</Text>
                </Flex>
                <ProgressBar
                  value={(director.count / data.top_directors[0].count) * 100}
                  color="blue"
                  className="mt-1"
                />
              </div>
            ))}
          </div>
        </Card>

        <Card className="bg-white border-cream-200 ring-0 shadow-sm">
          <Title className="text-[var(--text-primary)] font-display">Top Actors</Title>
          <div className="mt-4 space-y-3">
            {data.top_actors?.slice(0, 8).map((actor) => (
              <div key={actor.name}>
                <Flex>
                  <Text className="text-[var(--text-body)]">{actor.name}</Text>
                  <Text className="text-[var(--text-muted)]">{actor.count}</Text>
                </Flex>
                <ProgressBar
                  value={(actor.count / (data.top_actors?.[0]?.count || 1)) * 100}
                  color="rose"
                  className="mt-1"
                />
              </div>
            ))}
          </div>
        </Card>

        <Card className="bg-white border-cream-200 ring-0 shadow-sm">
          <Title className="text-[var(--text-primary)] font-display">By Decade</Title>
          <DonutChart
            className="mt-6 h-52"
            data={data.top_decades}
            category="count"
            index="decade"
            colors={['green', 'blue', 'indigo', 'rose', 'amber', 'teal', 'orange', 'slate']}
            showLabel={true}
            showAnimation={true}
          />
        </Card>
      </Grid>

      {data.runtime_stats?.longest && data.runtime_stats?.shortest && (
        <div>
          <h2 className="text-2xl font-display font-semibold text-[var(--text-primary)] mb-6">Runtime Extremes</h2>
          <Grid numItemsMd={2} className="gap-5">
            <Card className="bg-white border-cream-200 ring-0 shadow-sm">
              <Title className="text-[var(--text-primary)] font-display">Longest Film</Title>
              <Flex className="mt-4 gap-4">
                <div className="w-20 h-30 bg-cream-100 rounded overflow-hidden flex-shrink-0">
                  {data.runtime_stats.longest.poster_url && (
                    <img
                      src={data.runtime_stats.longest.poster_url}
                      alt={data.runtime_stats.longest.title}
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
                <div>
                  <Text className="text-[var(--text-primary)] font-semibold">{data.runtime_stats.longest.title}</Text>
                  <Text className="text-[var(--text-muted)]">{data.runtime_stats.longest.year}</Text>
                  <Metric className="text-sage mt-2 font-mono">{data.runtime_stats.longest.runtime} min</Metric>
                  <Text className="text-[var(--text-muted)]">{Math.round(data.runtime_stats.longest.runtime / 60 * 10) / 10} hours</Text>
                </div>
              </Flex>
            </Card>

            <Card className="bg-white border-cream-200 ring-0 shadow-sm">
              <Title className="text-[var(--text-primary)] font-display">Shortest Film</Title>
              <Flex className="mt-4 gap-4">
                <div className="w-20 h-30 bg-cream-100 rounded overflow-hidden flex-shrink-0">
                  {data.runtime_stats.shortest.poster_url && (
                    <img
                      src={data.runtime_stats.shortest.poster_url}
                      alt={data.runtime_stats.shortest.title}
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
                <div>
                  <Text className="text-[var(--text-primary)] font-semibold">{data.runtime_stats.shortest.title}</Text>
                  <Text className="text-[var(--text-muted)]">{data.runtime_stats.shortest.year}</Text>
                  <Metric className="text-ink mt-2 font-mono">{data.runtime_stats.shortest.runtime} min</Metric>
                </div>
              </Flex>
            </Card>
          </Grid>
        </div>
      )}

      <div>
        <h2 className="text-2xl font-display font-semibold text-[var(--text-primary)] mb-6">Where Your Films Come From</h2>
        <Grid numItemsMd={3} className="gap-5">
          <Card className="bg-white border-cream-200 ring-0 shadow-sm">
            <Title className="text-[var(--text-primary)] font-display">Top Countries</Title>
            <div className="mt-4 space-y-3">
              {data.top_countries?.slice(0, 8).map((country) => (
                <div key={country.name}>
                  <Flex>
                    <Text className="text-[var(--text-body)]">{country.name}</Text>
                    <Text className="text-[var(--text-muted)]">{country.count}</Text>
                  </Flex>
                  <ProgressBar
                    value={(country.count / (data.top_countries?.[0]?.count || 1)) * 100}
                    color="amber"
                    className="mt-1"
                  />
                </div>
              ))}
            </div>
          </Card>

          <Card className="bg-white border-cream-200 ring-0 shadow-sm">
            <Title className="text-[var(--text-primary)] font-display">Top Languages</Title>
            <div className="mt-4 space-y-3">
              {data.top_languages?.slice(0, 8).map((lang) => (
                <div key={lang.name}>
                  <Flex>
                    <Text className="text-[var(--text-body)]">{lang.name}</Text>
                    <Text className="text-[var(--text-muted)]">{lang.count}</Text>
                  </Flex>
                  <ProgressBar
                    value={(lang.count / (data.top_languages?.[0]?.count || 1)) * 100}
                    color="rose"
                    className="mt-1"
                  />
                </div>
              ))}
            </div>
          </Card>

          <Card className="bg-white border-cream-200 ring-0 shadow-sm">
            <Title className="text-[var(--text-primary)] font-display">Top Studios</Title>
            <div className="mt-4 space-y-3">
              {data.top_studios?.slice(0, 8).map((studio) => (
                <div key={studio.name}>
                  <Flex>
                    <Text className="text-[var(--text-body)]">{studio.name}</Text>
                    <Text className="text-[var(--text-muted)]">{studio.count}</Text>
                  </Flex>
                  <ProgressBar
                    value={(studio.count / (data.top_studios?.[0]?.count || 1)) * 100}
                    color="blue"
                    className="mt-1"
                  />
                </div>
              ))}
            </div>
          </Card>
        </Grid>
      </div>

      <div>
        <h2 className="text-2xl font-display font-semibold text-[var(--text-primary)] mb-6">Behind the Camera</h2>
        <Grid numItemsMd={3} className="gap-5">
          <Card className="bg-white border-cream-200 ring-0 shadow-sm">
            <Title className="text-[var(--text-primary)] font-display">Top Writers</Title>
            <div className="mt-4 space-y-3">
              {data.top_writers?.slice(0, 8).map((writer) => (
                <div key={writer.name}>
                  <Flex>
                    <Text className="text-[var(--text-body)]">{writer.name}</Text>
                    <Text className="text-[var(--text-muted)]">{writer.count}</Text>
                  </Flex>
                  <ProgressBar
                    value={(writer.count / (data.top_writers?.[0]?.count || 1)) * 100}
                    color="fuchsia"
                    className="mt-1"
                  />
                </div>
              ))}
            </div>
          </Card>

          <Card className="bg-white border-cream-200 ring-0 shadow-sm">
            <Title className="text-[var(--text-primary)] font-display">Top Composers</Title>
            <div className="mt-4 space-y-3">
              {data.top_composers?.slice(0, 8).map((composer) => (
                <div key={composer.name}>
                  <Flex>
                    <Text className="text-[var(--text-body)]">{composer.name}</Text>
                    <Text className="text-[var(--text-muted)]">{composer.count}</Text>
                  </Flex>
                  <ProgressBar
                    value={(composer.count / (data.top_composers?.[0]?.count || 1)) * 100}
                    color="orange"
                    className="mt-1"
                  />
                </div>
              ))}
            </div>
          </Card>

          <Card className="bg-white border-cream-200 ring-0 shadow-sm">
            <Title className="text-[var(--text-primary)] font-display">Top Cinematographers</Title>
            <div className="mt-4 space-y-3">
              {data.top_cinematographers?.slice(0, 8).map((dp) => (
                <div key={dp.name}>
                  <Flex>
                    <Text className="text-[var(--text-body)]">{dp.name}</Text>
                    <Text className="text-[var(--text-muted)]">{dp.count}</Text>
                  </Flex>
                  <ProgressBar
                    value={(dp.count / (data.top_cinematographers?.[0]?.count || 1)) * 100}
                    color="teal"
                    className="mt-1"
                  />
                </div>
              ))}
            </div>
          </Card>
        </Grid>
      </div>

      <div>
        <h2 className="text-2xl font-display font-semibold text-[var(--text-primary)] mb-6">Recently Watched</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-5">
          {data.recent_films.slice(0, 12).map((film, i) => (
            <div key={i} className="group">
              <div className="aspect-[2/3] bg-cream-100 rounded-lg overflow-hidden mb-2 shadow-sm">
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
              <p className="text-sm text-[var(--text-primary)] truncate group-hover:text-rust transition-colors">{film.title}</p>
              <p className="text-xs text-[var(--text-muted)]">
                {film.year} • {film.rating ? `★ ${film.rating}` : 'No rating'}
              </p>
            </div>
          ))}
        </div>
      </div>

      {data.liked_films && data.liked_films.length > 0 && (
        <div>
          <h2 className="text-2xl font-display font-semibold text-[var(--text-primary)] mb-6">
            <span className="text-rust">♥</span> Recently Liked
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-5">
            {data.liked_films.slice(0, 12).map((film, i) => (
              <div key={i} className="group">
                <div className="aspect-[2/3] bg-cream-100 rounded-lg overflow-hidden mb-2 ring-2 ring-rust/20 shadow-sm">
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
                <p className="text-sm text-[var(--text-primary)] truncate group-hover:text-rust transition-colors">{film.title}</p>
                <p className="text-xs text-[var(--text-muted)]">
                  {film.year} {film.rating ? `• ★ ${film.rating}` : ''}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
