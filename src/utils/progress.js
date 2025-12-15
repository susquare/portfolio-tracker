import { parseISO, differenceInDays } from 'date-fns';

// Calculate task effort in days
function calculateTaskEffort(task) {
  if (task.startDate && task.endDate) {
    const start = parseISO(task.startDate);
    const end = parseISO(task.endDate);
    return differenceInDays(end, start) + 1; // +1 to include both start and end day
  } else if (task.estimatedHours) {
    // Convert hours to days (assuming 8 hours per day)
    return task.estimatedHours / 8;
  } else {
    // Default to 1 day if no dates/hours
    return 1;
  }
}

// Calculate milestone progress based on task effort
export function calculateMilestoneProgress(milestone) {
  const tasks = milestone.tasks || [];
  if (tasks.length === 0) {
    // If no tasks, fall back to milestone status
    return milestone.status === 'completed' ? 100 : milestone.status === 'in-progress' ? 50 : 0;
  }

  let totalEffort = 0;
  let completedEffort = 0;

  tasks.forEach(task => {
    const taskEffort = calculateTaskEffort(task);
    totalEffort += taskEffort;
    
    if (task.status === 'completed') {
      completedEffort += taskEffort;
    } else if (task.status === 'in-progress' && task.startDate && task.endDate) {
      // Partial credit for in-progress tasks based on elapsed time
      const start = parseISO(task.startDate);
      const end = parseISO(task.endDate);
      const today = new Date();
      if (today >= start && today <= end) {
        const elapsed = differenceInDays(today, start) + 1;
        const total = differenceInDays(end, start) + 1;
        completedEffort += (elapsed / total) * taskEffort;
      }
    }
  });

  return totalEffort > 0 ? Math.round((completedEffort / totalEffort) * 100) : 0;
}

// Calculate project progress based on total task effort across all milestones
export function calculateProjectProgress(project) {
  const milestones = project.milestones || [];
  if (milestones.length === 0) {
    return 0;
  }

  let totalEffort = 0;
  let completedEffort = 0;

  milestones.forEach(milestone => {
    const tasks = milestone.tasks || [];
    if (tasks.length === 0) {
      // If milestone has no tasks, use milestone status as effort
      const milestoneEffort = 1; // Default 1 day per milestone without tasks
      totalEffort += milestoneEffort;
      if (milestone.status === 'completed') {
        completedEffort += milestoneEffort;
      } else if (milestone.status === 'in-progress') {
        completedEffort += milestoneEffort * 0.5; // 50% for in-progress milestones
      }
      return;
    }

    tasks.forEach(task => {
      const taskEffort = calculateTaskEffort(task);
      totalEffort += taskEffort;
      
      if (task.status === 'completed') {
        completedEffort += taskEffort;
      } else if (task.status === 'in-progress' && task.startDate && task.endDate) {
        // Partial credit for in-progress tasks based on elapsed time
        const start = parseISO(task.startDate);
        const end = parseISO(task.endDate);
        const today = new Date();
        if (today >= start && today <= end) {
          const elapsed = differenceInDays(today, start) + 1;
          const total = differenceInDays(end, start) + 1;
          completedEffort += (elapsed / total) * taskEffort;
        }
      }
    });
  });

  return totalEffort > 0 ? Math.round((completedEffort / totalEffort) * 100) : 0;
}

