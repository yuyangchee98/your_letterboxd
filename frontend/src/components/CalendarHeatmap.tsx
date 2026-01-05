import { useCalendarData } from '../hooks/useApi';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function getColor(count: number): string {
  if (count === 0) return '#F5F0E8';  // cream-100
  if (count === 1) return '#C5D9CB';  // very light sage
  if (count === 2) return '#9BBB9F';  // light sage
  if (count === 3) return '#7A9B84';  // sage-light
  return '#5B7C65';                    // sage
}

export default function CalendarHeatmap() {
  const { data, loading } = useCalendarData();

  if (loading) {
    return <div className="h-32 animate-pulse bg-cream-100 rounded" />;
  }

  const countMap = new Map(data.map(d => [d.date, d.count]));

  const today = new Date();
  const days: { date: Date; count: number }[] = [];

  for (let i = 364; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    days.push({
      date,
      count: countMap.get(dateStr) || 0,
    });
  }

  const weeks: typeof days[] = [];
  let currentWeek: typeof days = [];

  const firstDayOfWeek = days[0].date.getDay();
  for (let i = 0; i < firstDayOfWeek; i++) {
    currentWeek.push({ date: new Date(0), count: -1 });
  }

  for (const day of days) {
    currentWeek.push(day);
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  }
  if (currentWeek.length > 0) {
    weeks.push(currentWeek);
  }

  const monthLabels: { label: string; weekIndex: number }[] = [];
  let lastMonth = -1;
  weeks.forEach((week, weekIndex) => {
    const validDay = week.find(d => d.count >= 0);
    if (validDay) {
      const month = validDay.date.getMonth();
      if (month !== lastMonth) {
        monthLabels.push({ label: MONTHS[month], weekIndex });
        lastMonth = month;
      }
    }
  });

  const totalFilms = data.reduce((sum, d) => sum + d.count, 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-[var(--text-muted)]">{totalFilms} films in the last year</p>
        <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
          <span>Less</span>
          <div className="flex gap-1">
            {[0, 1, 2, 3, 4].map(i => (
              <div
                key={i}
                className="w-3 h-3 rounded-sm"
                style={{ backgroundColor: getColor(i) }}
              />
            ))}
          </div>
          <span>More</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="inline-flex flex-col gap-1">
          <div className="flex gap-1 mb-1 ml-8">
            {monthLabels.map((m, i) => (
              <div
                key={i}
                className="text-xs text-[var(--text-muted)]"
                style={{
                  marginLeft: i === 0 ? m.weekIndex * 14 : (m.weekIndex - monthLabels[i - 1].weekIndex - 1) * 14,
                  width: 28,
                }}
              >
                {m.label}
              </div>
            ))}
          </div>

          <div className="flex gap-1">
            <div className="flex flex-col gap-1 mr-1">
              {DAYS.map((day, i) => (
                <div key={day} className="h-3 text-xs text-[var(--text-muted)] flex items-center">
                  {i % 2 === 1 ? day.charAt(0) : ''}
                </div>
              ))}
            </div>

            {weeks.map((week, weekIndex) => (
              <div key={weekIndex} className="flex flex-col gap-1">
                {week.map((day, dayIndex) => (
                  <div
                    key={dayIndex}
                    className="w-3 h-3 rounded-sm transition-colors hover:ring-1 hover:ring-sage/50"
                    style={{
                      backgroundColor: day.count < 0 ? 'transparent' : getColor(day.count),
                    }}
                    title={
                      day.count >= 0
                        ? `${day.date.toLocaleDateString()}: ${day.count} film${day.count !== 1 ? 's' : ''}`
                        : undefined
                    }
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
