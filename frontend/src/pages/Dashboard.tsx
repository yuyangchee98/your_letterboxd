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
        <div className="animate-pulse text-[#99aabb]">Loading your stats...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="text-center py-12">
        <Text>Failed to load dashboard data</Text>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Hero Stats */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-6">Overview</h2>
        <Grid numItemsMd={2} numItemsLg={4} className="gap-6">
          <Card className="bg-[#1c2228] border-[#2c3440] ring-0">
            <Text className="text-[#99aabb]">Films Watched</Text>
            <Metric className="text-white">{data.total_films}</Metric>
            <Flex className="mt-4">
              <Text className="text-[#00e054]">{data.films_this_year} this year</Text>
            </Flex>
          </Card>

          <Card className="bg-[#1c2228] border-[#2c3440] ring-0">
            <Text className="text-[#99aabb]">Hours Watched</Text>
            <Metric className="text-white">{data.total_hours.toLocaleString()}</Metric>
            <Flex className="mt-4">
              <Text className="text-[#99aabb]">{Math.round(data.total_hours / 24)} days of film</Text>
            </Flex>
          </Card>

          <Card className="bg-[#1c2228] border-[#2c3440] ring-0">
            <Text className="text-[#99aabb]">Your Average Rating</Text>
            <Metric className="text-white">{data.avg_rating.toFixed(1)}</Metric>
            <Flex className="mt-4 gap-2">
              <Text className="text-[#99aabb]">vs</Text>
              <Text className="text-[#40bcf4]">{data.letterboxd_avg.toFixed(1)} Letterboxd avg</Text>
            </Flex>
          </Card>

          <Card className="bg-[#1c2228] border-[#2c3440] ring-0">
            <Text className="text-[#99aabb]">This Month</Text>
            <Metric className="text-white">{data.films_this_month}</Metric>
            <Flex className="mt-4">
              <Text className="text-[#99aabb]">films watched</Text>
            </Flex>
          </Card>
        </Grid>

        {/* Secondary Stats Row */}
        <Grid numItemsMd={2} numItemsLg={4} className="gap-6 mt-6">
          <Card className="bg-[#1c2228] border-[#2c3440] ring-0">
            <Text className="text-[#99aabb]">Average Runtime</Text>
            <Metric className="text-white">{data.runtime_stats?.avg_runtime || 0} min</Metric>
            <Flex className="mt-4">
              <Text className="text-[#99aabb]">{Math.round((data.runtime_stats?.avg_runtime || 0) / 60 * 10) / 10}h per film</Text>
            </Flex>
          </Card>

          <Card className="bg-[#1c2228] border-[#2c3440] ring-0">
            <Text className="text-[#99aabb]">Rewatches</Text>
            <Metric className="text-white">{data.total_rewatches || 0}</Metric>
            <Flex className="mt-4">
              <Text className="text-[#99aabb]">films seen again</Text>
            </Flex>
          </Card>

          <Card className="bg-[#1c2228] border-[#2c3440] ring-0">
            <Text className="text-[#99aabb]">Liked Films</Text>
            <Metric className="text-white">{data.total_liked || 0}</Metric>
            <Flex className="mt-4">
              <Text className="text-[#ff8000]">♥ favorites</Text>
            </Flex>
          </Card>

          <Card className="bg-[#1c2228] border-[#2c3440] ring-0">
            <Text className="text-[#99aabb]">Logged vs Unlogged</Text>
            <Metric className="text-white">{data.total_logged || 0}</Metric>
            <Flex className="mt-4">
              <Text className="text-[#99aabb]">{data.total_unlogged || 0} unlogged watches</Text>
            </Flex>
          </Card>
        </Grid>
      </div>

      {/* Calendar Heatmap */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-6">Watch Activity</h2>
        <Card className="bg-[#1c2228] border-[#2c3440] ring-0">
          <CalendarHeatmap />
        </Card>
      </div>

      {/* Charts Row */}
      <Grid numItemsMd={2} className="gap-6">
        {/* Rating Distribution */}
        <Card className="bg-[#1c2228] border-[#2c3440] ring-0">
          <Title className="text-white">Your Ratings</Title>
          <Text className="text-[#99aabb]">Distribution of your ratings</Text>
          <BarChart
            className="mt-6 h-60"
            data={data.rating_distribution}
            index="rating"
            categories={['count']}
            colors={['emerald']}
            showLegend={false}
            showGridLines={false}
            yAxisWidth={40}
          />
        </Card>

        {/* Films by Month */}
        <Card className="bg-[#1c2228] border-[#2c3440] ring-0">
          <Title className="text-white">Films Over Time</Title>
          <Text className="text-[#99aabb]">Monthly watch count</Text>
          <AreaChart
            className="mt-6 h-60"
            data={data.films_by_month}
            index="month"
            categories={['count']}
            colors={['cyan']}
            showLegend={false}
            showGridLines={false}
            yAxisWidth={40}
          />
        </Card>
      </Grid>

      {/* Top Lists */}
      <Grid numItemsMd={2} numItemsLg={4} className="gap-6">
        {/* Top Genres */}
        <Card className="bg-[#1c2228] border-[#2c3440] ring-0">
          <Title className="text-white">Top Genres</Title>
          <div className="mt-4 space-y-3">
            {data.top_genres.slice(0, 8).map((genre) => (
              <div key={genre.name}>
                <Flex>
                  <Text className="text-white">{genre.name}</Text>
                  <Text className="text-[#99aabb]">{genre.count}</Text>
                </Flex>
                <ProgressBar
                  value={(genre.count / data.top_genres[0].count) * 100}
                  color="emerald"
                  className="mt-1"
                />
              </div>
            ))}
          </div>
        </Card>

        {/* Top Directors */}
        <Card className="bg-[#1c2228] border-[#2c3440] ring-0">
          <Title className="text-white">Top Directors</Title>
          <div className="mt-4 space-y-3">
            {data.top_directors.slice(0, 8).map((director) => (
              <div key={director.name}>
                <Flex>
                  <Text className="text-white">{director.name}</Text>
                  <Text className="text-[#99aabb]">{director.count}</Text>
                </Flex>
                <ProgressBar
                  value={(director.count / data.top_directors[0].count) * 100}
                  color="cyan"
                  className="mt-1"
                />
              </div>
            ))}
          </div>
        </Card>

        {/* Top Actors */}
        <Card className="bg-[#1c2228] border-[#2c3440] ring-0">
          <Title className="text-white">Top Actors</Title>
          <div className="mt-4 space-y-3">
            {data.top_actors?.slice(0, 8).map((actor) => (
              <div key={actor.name}>
                <Flex>
                  <Text className="text-white">{actor.name}</Text>
                  <Text className="text-[#99aabb]">{actor.count}</Text>
                </Flex>
                <ProgressBar
                  value={(actor.count / (data.top_actors?.[0]?.count || 1)) * 100}
                  color="violet"
                  className="mt-1"
                />
              </div>
            ))}
          </div>
        </Card>

        {/* Top Decades */}
        <Card className="bg-[#1c2228] border-[#2c3440] ring-0">
          <Title className="text-white">By Decade</Title>
          <DonutChart
            className="mt-6 h-52"
            data={data.top_decades}
            category="count"
            index="decade"
            colors={['emerald', 'cyan', 'blue', 'violet', 'fuchsia', 'rose', 'amber', 'lime']}
            showLabel={true}
            showAnimation={true}
          />
        </Card>
      </Grid>

      {/* Runtime Extremes */}
      {data.runtime_stats?.longest && data.runtime_stats?.shortest && (
        <div>
          <h2 className="text-2xl font-bold text-white mb-6">Runtime Extremes</h2>
          <Grid numItemsMd={2} className="gap-6">
            <Card className="bg-[#1c2228] border-[#2c3440] ring-0">
              <Title className="text-white">Longest Film</Title>
              <Flex className="mt-4 gap-4">
                <div className="w-20 h-30 bg-[#2c3440] rounded overflow-hidden flex-shrink-0">
                  {data.runtime_stats.longest.poster_url && (
                    <img
                      src={data.runtime_stats.longest.poster_url}
                      alt={data.runtime_stats.longest.title}
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
                <div>
                  <Text className="text-white font-semibold">{data.runtime_stats.longest.title}</Text>
                  <Text className="text-[#99aabb]">{data.runtime_stats.longest.year}</Text>
                  <Metric className="text-[#00e054] mt-2">{data.runtime_stats.longest.runtime} min</Metric>
                  <Text className="text-[#99aabb]">{Math.round(data.runtime_stats.longest.runtime / 60 * 10) / 10} hours</Text>
                </div>
              </Flex>
            </Card>

            <Card className="bg-[#1c2228] border-[#2c3440] ring-0">
              <Title className="text-white">Shortest Film</Title>
              <Flex className="mt-4 gap-4">
                <div className="w-20 h-30 bg-[#2c3440] rounded overflow-hidden flex-shrink-0">
                  {data.runtime_stats.shortest.poster_url && (
                    <img
                      src={data.runtime_stats.shortest.poster_url}
                      alt={data.runtime_stats.shortest.title}
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
                <div>
                  <Text className="text-white font-semibold">{data.runtime_stats.shortest.title}</Text>
                  <Text className="text-[#99aabb]">{data.runtime_stats.shortest.year}</Text>
                  <Metric className="text-[#40bcf4] mt-2">{data.runtime_stats.shortest.runtime} min</Metric>
                </div>
              </Flex>
            </Card>
          </Grid>
        </div>
      )}

      {/* Recent Films */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-6">Recently Watched</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {data.recent_films.slice(0, 12).map((film, i) => (
            <div key={i} className="group">
              <div className="aspect-[2/3] bg-[#2c3440] rounded-lg overflow-hidden mb-2">
                {film.poster_url ? (
                  <img
                    src={film.poster_url}
                    alt={film.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[#99aabb] text-xs text-center p-2">
                    {film.title}
                  </div>
                )}
              </div>
              <p className="text-sm text-white truncate">{film.title}</p>
              <p className="text-xs text-[#99aabb]">
                {film.year} • {film.rating ? `★ ${film.rating}` : 'No rating'}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
