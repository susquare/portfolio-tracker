import { useMemo } from 'react';
import { format, parseISO, differenceInDays, addDays, startOfWeek, endOfWeek, isWithinInterval, isBefore, isAfter } from 'date-fns';

const STATUS_COLORS = {
  'pending': '#64748b',
  'in-progress': '#f59e0b',
  'completed': '#22c55e',
};

export default function GanttChart({ milestones, projectColor = '#818cf8' }) {
  const { chartData, dateRange, weeks } = useMemo(() => {
    if (!milestones || milestones.length === 0) {
      return { chartData: [], dateRange: null, weeks: [] };
    }

    // Filter milestones with dates
    const milestonesWithDates = milestones.filter(m => m.dueDate || m.createdAt);
    
    if (milestonesWithDates.length === 0) {
      return { chartData: [], dateRange: null, weeks: [] };
    }

    // Calculate date range
    const dates = milestonesWithDates.flatMap(m => {
      const result = [];
      if (m.createdAt) result.push(parseISO(m.createdAt));
      if (m.dueDate) result.push(parseISO(m.dueDate));
      return result;
    });

    const minDate = startOfWeek(new Date(Math.min(...dates)));
    const maxDate = endOfWeek(addDays(new Date(Math.max(...dates)), 7));
    const totalDays = differenceInDays(maxDate, minDate) + 1;

    // Generate weeks
    const weeksArray = [];
    let currentWeekStart = minDate;
    while (isBefore(currentWeekStart, maxDate)) {
      weeksArray.push({
        start: currentWeekStart,
        end: endOfWeek(currentWeekStart),
        label: format(currentWeekStart, 'MMM d'),
      });
      currentWeekStart = addDays(currentWeekStart, 7);
    }

    // Calculate bar positions
    const data = milestones.map(milestone => {
      const startDate = milestone.createdAt ? parseISO(milestone.createdAt) : new Date();
      const endDate = milestone.dueDate ? parseISO(milestone.dueDate) : addDays(startDate, 7);
      
      const startOffset = Math.max(0, differenceInDays(startDate, minDate));
      const duration = Math.max(1, differenceInDays(endDate, startDate) + 1);
      
      const startPercent = (startOffset / totalDays) * 100;
      const widthPercent = (duration / totalDays) * 100;

      return {
        ...milestone,
        startDate,
        endDate,
        startPercent,
        widthPercent,
        isOverdue: milestone.status !== 'completed' && isBefore(endDate, new Date()),
      };
    });

    return {
      chartData: data,
      dateRange: { min: minDate, max: maxDate, totalDays },
      weeks: weeksArray,
    };
  }, [milestones]);

  if (!dateRange || chartData.length === 0) {
    return (
      <div className="gantt-empty">
        <p>Add milestones with due dates to see the Gantt chart</p>
      </div>
    );
  }

  // Today marker position
  const today = new Date();
  const todayOffset = differenceInDays(today, dateRange.min);
  const todayPercent = (todayOffset / dateRange.totalDays) * 100;
  const showTodayMarker = todayPercent >= 0 && todayPercent <= 100;

  return (
    <div className="gantt-chart">
      <div className="gantt-header">
        <div className="gantt-task-header">Milestone</div>
        <div className="gantt-timeline-header">
          {weeks.map((week, index) => (
            <div key={index} className="gantt-week" style={{ width: `${100 / weeks.length}%` }}>
              {week.label}
            </div>
          ))}
        </div>
      </div>
      
      <div className="gantt-body">
        {showTodayMarker && (
          <div 
            className="gantt-today-marker" 
            style={{ left: `calc(200px + ${todayPercent}% * (100% - 200px) / 100)` }}
          >
            <span className="today-label">Today</span>
          </div>
        )}
        
        {chartData.map(milestone => (
          <div key={milestone.id} className="gantt-row">
            <div className="gantt-task-name">
              <span className={`status-dot ${milestone.status}`}></span>
              <span className="task-title" title={milestone.title}>
                {milestone.title}
              </span>
            </div>
            <div className="gantt-timeline">
              <div className="gantt-grid">
                {weeks.map((_, index) => (
                  <div key={index} className="gantt-grid-cell"></div>
                ))}
              </div>
              <div 
                className={`gantt-bar ${milestone.status} ${milestone.isOverdue ? 'overdue' : ''}`}
                style={{
                  left: `${milestone.startPercent}%`,
                  width: `${Math.max(milestone.widthPercent, 2)}%`,
                  backgroundColor: milestone.status === 'completed' 
                    ? STATUS_COLORS.completed 
                    : milestone.isOverdue 
                      ? '#ef4444' 
                      : STATUS_COLORS[milestone.status] || projectColor,
                }}
                title={`${milestone.title}: ${format(milestone.startDate, 'MMM d')} - ${format(milestone.endDate, 'MMM d, yyyy')}`}
              >
                {milestone.widthPercent > 10 && (
                  <span className="bar-label">{milestone.title}</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
      
      <div className="gantt-legend">
        <div className="legend-item">
          <span className="legend-color" style={{ backgroundColor: STATUS_COLORS.pending }}></span>
          <span>Pending</span>
        </div>
        <div className="legend-item">
          <span className="legend-color" style={{ backgroundColor: STATUS_COLORS['in-progress'] }}></span>
          <span>In Progress</span>
        </div>
        <div className="legend-item">
          <span className="legend-color" style={{ backgroundColor: STATUS_COLORS.completed }}></span>
          <span>Completed</span>
        </div>
        <div className="legend-item">
          <span className="legend-color" style={{ backgroundColor: '#ef4444' }}></span>
          <span>Overdue</span>
        </div>
      </div>
    </div>
  );
}

