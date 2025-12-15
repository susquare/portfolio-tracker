import { useProjects } from '../store/ProjectContext';
import { 
  TrendingUp, 
  CheckCircle2, 
  Clock, 
  AlertTriangle,
  Target,
  Users,
  Calendar,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { format, isAfter, isBefore, parseISO, differenceInDays } from 'date-fns';

export default function Dashboard({ onNavigate }) {
  const { projects, teams, teamMembers } = useProjects();
  
  // Calculate metrics
  const totalProjects = projects.length;
  const approvedProjects = projects.filter(p => p.portfolioIntake === 'approved').length;
  const inReviewProjects = projects.filter(p => p.portfolioIntake === 'in-review').length;
  const newProjects = projects.filter(p => p.portfolioIntake === 'new').length;
  
  const allMilestones = projects.flatMap(p => p.milestones || []);
  const totalMilestones = allMilestones.length;
  const completedMilestones = allMilestones.filter(m => m.status === 'completed').length;
  const inProgressMilestones = allMilestones.filter(m => m.status === 'in-progress').length;
  const pendingMilestones = allMilestones.filter(m => m.status === 'pending').length;
  
  const overdueMilestones = allMilestones.filter(m => {
    if (m.status === 'completed' || !m.dueDate) return false;
    return isBefore(parseISO(m.dueDate), new Date());
  });
  
  const upcomingMilestones = allMilestones
    .filter(m => {
      if (m.status === 'completed' || !m.dueDate) return false;
      const dueDate = parseISO(m.dueDate);
      const daysUntil = differenceInDays(dueDate, new Date());
      return daysUntil >= 0 && daysUntil <= 7;
    })
    .sort((a, b) => parseISO(a.dueDate) - parseISO(b.dueDate))
    .slice(0, 5);
  
  const completionRate = totalMilestones > 0 
    ? Math.round((completedMilestones / totalMilestones) * 100) 
    : 0;
  
  // Calculate task metrics - planned vs actual (only tasks with planned end dates)
  const tasksWithPlannedDates = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  projects.forEach(project => {
    (project.milestones || []).forEach(milestone => {
      (milestone.tasks || []).forEach(task => {
        // Only include tasks that have a planned end date
        if (task.endDate) {
          const plannedDate = parseISO(task.endDate);
          plannedDate.setHours(0, 0, 0, 0);
          
          let actualDate = null;
          let status = 'on-time';
          let daysDifference = 0;
          
          if (task.status === 'completed') {
            // If completed, check if there's a completion date
            // For now, we'll use today as the completion date if not specified
            // In a real app, you'd want to track completedAt when status changes to completed
            actualDate = task.completedAt ? parseISO(task.completedAt) : today;
            actualDate.setHours(0, 0, 0, 0);
            daysDifference = differenceInDays(actualDate, plannedDate);
            status = daysDifference > 0 ? 'late' : daysDifference < 0 ? 'early' : 'on-time';
          } else if (task.status === 'in-progress' || task.status === 'pending') {
            // If in progress or pending, compare today with planned date
            actualDate = today;
            daysDifference = differenceInDays(today, plannedDate);
            status = daysDifference > 0 ? 'overdue' : 'on-time';
          }
          
          tasksWithPlannedDates.push({
            ...task,
            projectId: project.id,
            projectName: project.name,
            milestoneId: milestone.id,
            milestoneTitle: milestone.title,
            plannedDate,
            actualDate,
            scheduleStatus: status, // 'overdue', 'late', 'on-time', 'early'
            daysDifference: Math.abs(daysDifference)
          });
        }
      });
    });
  });
  
  // Sort by days difference (most overdue first)
  tasksWithPlannedDates.sort((a, b) => {
    if (a.status === 'overdue' && b.status !== 'overdue') return -1;
    if (b.status === 'overdue' && a.status !== 'overdue') return 1;
    return b.daysDifference - a.daysDifference;
  });
  
  const overdueTasks = tasksWithPlannedDates.filter(t => t.scheduleStatus === 'overdue');
  const lateTasks = tasksWithPlannedDates.filter(t => t.scheduleStatus === 'late');
  const onTimeTasks = tasksWithPlannedDates.filter(t => t.scheduleStatus === 'on-time');
  const earlyTasks = tasksWithPlannedDates.filter(t => t.scheduleStatus === 'early');
  
  const totalOffSchedule = overdueTasks.length + lateTasks.length;
  
  // Team workload - count both milestones and tasks
  const assigneeWorkload = {};
  
  // Count milestones assigned to team members
  allMilestones.forEach(m => {
    if (m.assigneeId && m.status !== 'completed') {
      assigneeWorkload[m.assigneeId] = (assigneeWorkload[m.assigneeId] || 0) + 1;
    }
  });
  
  // Count tasks assigned to team members
  projects.forEach(project => {
    (project.milestones || []).forEach(milestone => {
      (milestone.tasks || []).forEach(task => {
        if (task.assigneeId && task.status !== 'completed') {
          assigneeWorkload[task.assigneeId] = (assigneeWorkload[task.assigneeId] || 0) + 1;
        }
      });
    });
  });
  
  // Calculate projects at risk (projects with overdue tasks or milestones)
  const projectsAtRisk = projects
    .map(project => {
      let overdueMilestonesCount = 0;
      let overdueTasksCount = 0;
      let riskReasons = [];
      
      // Check for overdue milestones
      (project.milestones || []).forEach(milestone => {
        if (milestone.dueDate && milestone.status !== 'completed') {
          const dueDate = parseISO(milestone.dueDate);
          if (isBefore(dueDate, today)) {
            overdueMilestonesCount++;
            riskReasons.push(`Milestone: ${milestone.title}`);
          }
        }
        
        // Check for overdue tasks
        (milestone.tasks || []).forEach(task => {
          if (task.endDate && task.status !== 'completed') {
            const endDate = parseISO(task.endDate);
            if (isBefore(endDate, today)) {
              overdueTasksCount++;
              riskReasons.push(`Task: ${task.title}`);
            }
          }
        });
      });
      
      return {
        ...project,
        overdueMilestonesCount,
        overdueTasksCount,
        totalOverdue: overdueMilestonesCount + overdueTasksCount,
        riskReasons: riskReasons.slice(0, 3) // Limit to first 3 reasons
      };
    })
    .filter(project => project.totalOverdue > 0)
    .sort((a, b) => b.totalOverdue - a.totalOverdue);
  
  // Calculate RAG status for projects
  const calculateRAGStatus = (project) => {
    let hasOverdue = false;
    let hasApproaching = false;
    
    // Check milestones
    (project.milestones || []).forEach(milestone => {
      if (milestone.dueDate && milestone.status !== 'completed') {
        const dueDate = parseISO(milestone.dueDate);
        const daysUntil = differenceInDays(dueDate, today);
        if (daysUntil < 0) {
          hasOverdue = true;
        } else if (daysUntil <= 7) {
          hasApproaching = true;
        }
      }
      
      // Check tasks
      (milestone.tasks || []).forEach(task => {
        if (task.endDate && task.status !== 'completed') {
          const endDate = parseISO(task.endDate);
          const daysUntil = differenceInDays(endDate, today);
          if (daysUntil < 0) {
            hasOverdue = true;
          } else if (daysUntil <= 7) {
            hasApproaching = true;
          }
        }
      });
    });
    
    if (hasOverdue) return 'red';
    if (hasApproaching) return 'amber';
    return 'green';
  };
  
  const recentProjects = [...projects]
    .map(project => ({
      ...project,
      ragStatus: calculateRAGStatus(project)
    }))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 5);

  return (
    <div className="dashboard">
      <header className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p className="subtitle">Overview of all your projects and milestones</p>
        </div>
      </header>
      
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-icon projects">
            <FolderIcon />
          </div>
          <div className="metric-content">
            <span className="metric-value">{totalProjects}</span>
            <span className="metric-label">Total Projects</span>
          </div>
          <div className="metric-badge">
            <span className="badge active">{approvedProjects} approved</span>
          </div>
        </div>
        
        <div className="metric-card">
          <div className="metric-icon risk">
            <AlertTriangle size={24} />
          </div>
          <div className="metric-content">
            <span className="metric-value">{projectsAtRisk.length}</span>
            <span className="metric-label">Projects at Risk</span>
          </div>
          <div className="metric-badge">
            {projectsAtRisk.length > 0 ? (
              <span className="badge danger">{projectsAtRisk.length} need attention</span>
            ) : (
              <span className="badge success">All on track</span>
            )}
          </div>
        </div>
        
        <div className="metric-card">
          <div className="metric-icon completion">
            <TrendingUp size={24} />
          </div>
          <div className="metric-content">
            <span className="metric-value">{completionRate}%</span>
            <span className="metric-label">Completion Rate</span>
          </div>
          <div className="metric-trend positive">
            <ArrowUpRight size={16} />
            <span>On track</span>
          </div>
        </div>
        
        <div className="metric-card">
          <div className="metric-icon overdue">
            <AlertTriangle size={24} />
          </div>
          <div className="metric-content">
            <span className="metric-value">{overdueMilestones.length}</span>
            <span className="metric-label">Overdue</span>
          </div>
          {overdueMilestones.length > 0 && (
            <div className="metric-trend negative">
              <ArrowDownRight size={16} />
              <span>Needs attention</span>
            </div>
          )}
        </div>
      </div>
      
      <div className="dashboard-grid">
        <div className="dashboard-card task-planned-vs-actual">
          <h3>Tasks: Planned vs Actual</h3>
          {tasksWithPlannedDates.length === 0 ? (
            <div className="empty-state small">
              <p>No tasks with planned dates yet</p>
            </div>
          ) : (
            <div className="planned-vs-actual-list">
              <div className="summary-stats">
                <div className="summary-item overdue">
                  <span className="summary-label">Overdue</span>
                  <span className="summary-value">{overdueTasks.length}</span>
                </div>
                <div className="summary-item late">
                  <span className="summary-label">Completed Late</span>
                  <span className="summary-value">{lateTasks.length}</span>
                </div>
                <div className="summary-item on-time">
                  <span className="summary-label">On Time</span>
                  <span className="summary-value">{onTimeTasks.length}</span>
                </div>
                {earlyTasks.length > 0 && (
                  <div className="summary-item early">
                    <span className="summary-label">Early</span>
                    <span className="summary-value">{earlyTasks.length}</span>
                  </div>
                )}
              </div>
              
              <div className="tasks-list-container">
                <h4 className="tasks-list-title">Tasks Not Completed as Planned</h4>
                {totalOffSchedule === 0 ? (
                  <div className="empty-state small">
                    <p>All tasks are on schedule! 🎉</p>
                  </div>
                ) : (
                  <ul className="planned-vs-actual-tasks">
                    {[...overdueTasks, ...lateTasks].slice(0, 10).map(task => {
                      const assignee = teamMembers.find(m => m.id === task.assigneeId);
                      return (
                        <li 
                          key={`${task.projectId}-${task.milestoneId}-${task.id}`}
                          className={`task-item ${task.scheduleStatus}`}
                          onClick={() => onNavigate('project', task.projectId)}
                        >
                          <div className="task-item-header">
                            <span className="task-title">{task.title}</span>
                            <span className={`status-badge ${task.scheduleStatus}`}>
                              {task.scheduleStatus === 'overdue' ? 'Overdue' : 'Late'}
                            </span>
                          </div>
                          <div className="task-item-meta">
                            <span className="task-project">{task.projectName}</span>
                            {assignee && (
                              <span className="task-assignee">{assignee.avatar} {assignee.name}</span>
                            )}
                          </div>
                          <div className="task-dates-comparison">
                            <div className="date-item planned">
                              <span className="date-label">Planned:</span>
                              <span className="date-value">{format(task.plannedDate, 'MMM d, yyyy')}</span>
                            </div>
                            <div className="date-item actual">
                              <span className="date-label">
                                {task.status === 'completed' ? 'Completed:' : 'As of today:'}
                              </span>
                              <span className="date-value">
                                {task.actualDate ? format(task.actualDate, 'MMM d, yyyy') : 'N/A'}
                              </span>
                            </div>
                            {task.daysDifference > 0 && (
                              <div className="days-difference">
                                {task.daysDifference} day{task.daysDifference !== 1 ? 's' : ''} {task.scheduleStatus === 'overdue' ? 'overdue' : 'late'}
                              </div>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>
          )}
        </div>
        
        <div className="dashboard-card projects-at-risk">
          <h3>
            <AlertTriangle size={18} />
            Projects at Risk
          </h3>
          {projectsAtRisk.length === 0 ? (
            <div className="empty-state small">
              <p>No projects at risk. All projects are on track! 🎉</p>
            </div>
          ) : (
            <ul className="projects-risk-list">
              {projectsAtRisk.map(project => {
                const projectTeam = teams.find(t => t.id === project.teamId);
                return (
                  <li 
                    key={project.id} 
                    className="risk-project-item"
                    onClick={() => onNavigate('project', project.id)}
                  >
                    <div className="risk-project-header">
                      <div className="risk-project-info">
                        <div 
                          className="project-color-indicator" 
                          style={{ backgroundColor: project.color || '#6366f1' }}
                        ></div>
                        <div className="risk-project-details">
                          <span className="risk-project-name">{project.name}</span>
                          {projectTeam && (
                            <span className="risk-project-team">{projectTeam.icon} {projectTeam.name}</span>
                          )}
                        </div>
                      </div>
                      <div className="risk-badge">
                        {project.totalOverdue} overdue
                      </div>
                    </div>
                    <div className="risk-breakdown">
                      {project.overdueMilestonesCount > 0 && (
                        <span className="risk-item">
                          {project.overdueMilestonesCount} milestone{project.overdueMilestonesCount !== 1 ? 's' : ''}
                        </span>
                      )}
                      {project.overdueTasksCount > 0 && (
                        <span className="risk-item">
                          {project.overdueTasksCount} task{project.overdueTasksCount !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                    {project.riskReasons.length > 0 && (
                      <div className="risk-reasons">
                        {project.riskReasons.map((reason, idx) => (
                          <span key={idx} className="risk-reason-tag">{reason}</span>
                        ))}
                        {project.totalOverdue > 3 && (
                          <span className="risk-reason-tag more">
                            +{project.totalOverdue - 3} more
                          </span>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        
        <div className="dashboard-card upcoming-milestones">
          <h3>
            <Calendar size={18} />
            Upcoming Deadlines
          </h3>
          {upcomingMilestones.length === 0 ? (
            <div className="empty-state small">
              <p>No upcoming deadlines this week</p>
            </div>
          ) : (
            <ul className="milestone-list">
              {upcomingMilestones.map(m => {
                const project = projects.find(p => p.milestones?.some(pm => pm.id === m.id));
                const daysUntil = differenceInDays(parseISO(m.dueDate), new Date());
                return (
                  <li key={m.id} className="milestone-item">
                    <div className="milestone-info">
                      <span className="milestone-title">{m.title}</span>
                      <span className="milestone-project">{project?.name}</span>
                    </div>
                    <span className={`due-badge ${daysUntil <= 2 ? 'urgent' : ''}`}>
                      {daysUntil === 0 ? 'Today' : daysUntil === 1 ? 'Tomorrow' : `${daysUntil} days`}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        
        <div className="dashboard-card team-workload">
          <h3>
            <Users size={18} />
            Team Workload
          </h3>
          <ul className="workload-list">
            {teamMembers.map(member => {
              const tasks = assigneeWorkload[member.id] || 0;
              const maxTasks = Math.max(...Object.values(assigneeWorkload), 1);
              return (
                <li key={member.id} className="workload-item">
                  <div className="member-info">
                    <span className="member-avatar">{member.avatar}</span>
                    <div className="member-details">
                      <span className="member-name">{member.name}</span>
                      <span className="member-role">{member.role}</span>
                    </div>
                  </div>
                  <div className="workload-bar-container">
                    <div 
                      className="workload-bar" 
                      style={{ width: `${(tasks / maxTasks) * 100}%` }}
                    ></div>
                    <span className="task-count">{tasks} {tasks === 1 ? 'assignment' : 'assignments'}</span>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
        
        <div className="dashboard-card recent-projects">
          <h3>Recent Projects</h3>
          {recentProjects.length === 0 ? (
            <div className="empty-state small">
              <p>No projects yet. Create your first project!</p>
            </div>
          ) : (
            <ul className="project-list">
              {recentProjects.map(project => (
                <li 
                  key={project.id} 
                  className="project-item"
                  onClick={() => onNavigate('project', project.id)}
                >
                  <div className="project-color" style={{ backgroundColor: project.color || '#6366f1' }}></div>
                  <div className="project-info">
                    <span className="project-name">{project.name}</span>
                    <span className="project-meta">
                      {project.milestones?.length || 0} milestones
                    </span>
                  </div>
                  <span className={`rag-indicator rag-${project.ragStatus}`} title={
                    project.ragStatus === 'red' ? 'At Risk' :
                    project.ragStatus === 'amber' ? 'On Watch' :
                    'On Track'
                  }>
                    <span className="rag-dot"></span>
                    {project.ragStatus === 'red' ? 'Red' :
                     project.ragStatus === 'amber' ? 'Amber' :
                     'Green'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function FolderIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"/>
    </svg>
  );
}

