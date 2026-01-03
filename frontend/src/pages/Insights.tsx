import { useState } from 'react';
import { Card, Title, Text, Metric, Flex, ProgressBar } from '@tremor/react';
import { Link } from 'react-router-dom';
import { useInsights } from '../hooks/useApi';

function LegendModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-[#1c2228] border border-[#2c3440] rounded-lg p-6 max-w-md mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-bold text-white mb-4">Rating Personality Legend</h3>

        <div className="space-y-4">
          <div>
            <p className="text-[#99aabb] text-xs uppercase mb-2">Personality Types</p>
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <span className="w-3 h-3 rounded-full bg-[#ff8000]"></span>
                <span className="text-[#ff8000] font-medium">The Tough Critic</span>
                <span className="text-[#99aabb] text-sm">(&lt; -0.3)</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="w-3 h-3 rounded-full bg-[#40bcf4]"></span>
                <span className="text-[#40bcf4] font-medium">The Balanced Judge</span>
                <span className="text-[#99aabb] text-sm">(-0.3 to +0.3)</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="w-3 h-3 rounded-full bg-[#00e054]"></span>
                <span className="text-[#00e054] font-medium">The Generous Viewer</span>
                <span className="text-[#99aabb] text-sm">(&gt; +0.3)</span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-[#2c3440]">
            <p className="text-[#99aabb] text-sm">
              The gap is calculated as your average rating minus the Letterboxd community average.
              A negative gap means you rate lower than most people.
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="mt-6 w-full py-2 bg-[#2c3440] hover:bg-[#3c4450] text-white rounded transition-colors"
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
          <tr className="border-b border-[#2c3440]">
            <th className="text-left py-2 px-3 text-[#99aabb] font-medium">Title</th>
            <th className="text-center py-2 px-3 text-[#99aabb] font-medium">Year</th>
            <th className="text-center py-2 px-3 text-[#99aabb] font-medium">You</th>
            <th className="text-center py-2 px-3 text-[#99aabb] font-medium">LB</th>
            <th className="text-center py-2 px-3 text-[#99aabb] font-medium">Gap</th>
          </tr>
        </thead>
        <tbody>
          {films.map((film) => (
            <tr key={film.film_id} className="border-b border-[#2c3440]/50 hover:bg-[#2c3440]/30">
              <td className="py-2 px-3">
                <Link to={`/films/${film.film_id}`} className="text-white hover:text-[#00e054]">
                  {film.title}
                </Link>
              </td>
              <td className="text-center py-2 px-3 text-[#99aabb]">{film.year}</td>
              <td className="text-center py-2 px-3 text-white">{film.user_rating}</td>
              <td className="text-center py-2 px-3 text-[#99aabb]">{film.letterboxd_rating}</td>
              <td className={`text-center py-2 px-3 font-medium ${gapColor}`}>
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
        <div className="animate-pulse text-[#99aabb]">Analyzing your taste...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <Text>Failed to load insights</Text>
      </div>
    );
  }

  const { rating_stats, underrated_by_letterboxd, overrated_by_letterboxd } = data;

  // Personality titles and descriptions
  const personalities: Record<string, { title: string; description: string; color: string }> = {
    harsh: {
      title: 'The Tough Critic',
      description: 'You hold films to a higher standard than most.',
      color: 'text-[#ff8000]',
    },
    generous: {
      title: 'The Generous Viewer',
      description: 'You tend to find more joy in films than the average viewer.',
      color: 'text-[#00e054]',
    },
    balanced: {
      title: 'The Balanced Judge',
      description: 'Your ratings align closely with the Letterboxd community.',
      color: 'text-[#40bcf4]',
    },
  };

  const personality = personalities[rating_stats.personality] || personalities.balanced;

  // Calculate progress bar position (0-100 scale, 50 = balanced)
  const progressValue = Math.max(0, Math.min(100, 50 + (rating_stats.avg_gap * 25)));

  const topGems = underrated_by_letterboxd.slice(0, 5);
  const topUnpopular = overrated_by_letterboxd.slice(0, 5);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Insights</h1>
        <p className="text-[#99aabb]">Deep analysis of your film taste</p>
      </div>

      {/* Rating Personality */}
      <Card className="bg-[#1c2228] border-[#2c3440] ring-0">
        <Title className="text-white">Your Rating Personality</Title>
        <div className="mt-6 text-center">
          <Metric className={personality.color}>{personality.title}</Metric>
          <Text className="text-[#99aabb] mt-2">{personality.description}</Text>

          <div className="mt-6 max-w-md mx-auto">
            <Flex className="mb-2">
              <Text className="text-[#ff8000]">Harsh</Text>
              <Text className="text-[#99aabb]">Balanced</Text>
              <Text className="text-[#00e054]">Generous</Text>
            </Flex>
            <ProgressBar value={progressValue} color="emerald" className="h-3" />
          </div>

          <div className="mt-6 grid grid-cols-3 gap-4 max-w-lg mx-auto">
            <div>
              <Text className="text-[#99aabb] text-xs uppercase">Your Average</Text>
              <p className="text-2xl font-bold text-white">{rating_stats.avg_user_rating}</p>
            </div>
            <div>
              <Text className="text-[#99aabb] text-xs uppercase">Difference</Text>
              <p className={`text-2xl font-bold ${rating_stats.avg_gap >= 0 ? 'text-[#00e054]' : 'text-[#ff8000]'}`}>
                {rating_stats.avg_gap >= 0 ? '+' : ''}{rating_stats.avg_gap}
              </p>
            </div>
            <div>
              <Text className="text-[#99aabb] text-xs uppercase">LB Average</Text>
              <p className="text-2xl font-bold text-white">{rating_stats.avg_letterboxd_rating}</p>
            </div>
          </div>

          <Text className="text-[#99aabb] mt-4">
            Based on {rating_stats.total_rated} rated films
          </Text>

          <button
            onClick={() => setShowLegend(true)}
            className="mt-4 text-[#40bcf4] hover:text-[#60dcff] text-sm"
          >
            What does this mean?
          </button>
        </div>
      </Card>

      {showLegend && <LegendModal onClose={() => setShowLegend(false)} />}

      {/* Hidden Gems */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Your Hidden Gems</h2>
        <p className="text-[#99aabb] mb-6">
          {underrated_by_letterboxd.length} films you loved more than most people
        </p>

        {/* Top 5 poster grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {topGems.map((film: RatedFilm) => (
            <Link to={`/films/${film.film_id}`} key={film.film_id} className="group">
              <div className="relative">
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
                <div className="absolute top-2 right-2 bg-[#00e054] text-[#14181c] text-xs font-bold px-2 py-1 rounded">
                  +{film.gap.toFixed(1)}
                </div>
              </div>
              <p className="text-sm text-white truncate">{film.title}</p>
              <p className="text-xs text-[#99aabb]">
                You: {film.user_rating} vs LB: {film.letterboxd_rating}
              </p>
            </Link>
          ))}
        </div>

        {/* Expandable table */}
        {underrated_by_letterboxd.length > 5 && (
          <div className="mt-4">
            <button
              onClick={() => setShowAllGems(!showAllGems)}
              className="text-[#00e054] hover:text-[#00ff66] text-sm font-medium"
            >
              {showAllGems
                ? 'Hide full list'
                : `Show all ${underrated_by_letterboxd.length} hidden gems`}
            </button>
            {showAllGems && (
              <FilmTable films={underrated_by_letterboxd} gapColor="text-[#00e054]" />
            )}
          </div>
        )}
      </div>

      {/* Unpopular Opinions */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Your Unpopular Opinions</h2>
        <p className="text-[#99aabb] mb-6">
          {overrated_by_letterboxd.length} films others loved more than you
        </p>

        {/* Top 5 poster grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {topUnpopular.map((film: RatedFilm) => (
            <Link to={`/films/${film.film_id}`} key={film.film_id} className="group">
              <div className="relative">
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
                <div className="absolute top-2 right-2 bg-[#ff8000] text-[#14181c] text-xs font-bold px-2 py-1 rounded">
                  {film.gap.toFixed(1)}
                </div>
              </div>
              <p className="text-sm text-white truncate">{film.title}</p>
              <p className="text-xs text-[#99aabb]">
                You: {film.user_rating} vs LB: {film.letterboxd_rating}
              </p>
            </Link>
          ))}
        </div>

        {/* Expandable table */}
        {overrated_by_letterboxd.length > 5 && (
          <div className="mt-4">
            <button
              onClick={() => setShowAllUnpopular(!showAllUnpopular)}
              className="text-[#ff8000] hover:text-[#ff9933] text-sm font-medium"
            >
              {showAllUnpopular
                ? 'Hide full list'
                : `Show all ${overrated_by_letterboxd.length} unpopular opinions`}
            </button>
            {showAllUnpopular && (
              <FilmTable films={overrated_by_letterboxd} gapColor="text-[#ff8000]" />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
