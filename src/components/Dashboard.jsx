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
  const activeProjects = projects.filter(p => p.status === 'active').length;
  const completedProjects = projects.filter(p => p.status === 'completed').length;
  
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
  
  // Team workload
  const assigneeWorkload = {};
  allMilestones.forEach(m => {
    if (m.assigneeId && m.status !== 'completed') {
      assigneeWorkload[m.assigneeId] = (assigneeWorkload[m.assigneeId] || 0) + 1;
    }
  });
  
  const recentProjects = [...projects]
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
            <span className="badge active">{activeProjects} active</span>
          </div>
        </div>
        
        <div className="metric-card">
          <div className="metric-icon milestones">
            <Target size={24} />
          </div>
          <div className="metric-content">
            <span className="metric-value">{totalMilestones}</span>
            <span className="metric-label">Total Milestones</span>
          </div>
          <div className="metric-badge">
            <span className="badge success">{completedMilestones} done</span>
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
        <div className="dashboard-card milestone-status">
          <h3>Milestone Status</h3>
          <div className="status-chart">
            <div className="chart-bars">
              <div className="chart-bar">
                <div className="bar-fill completed" style={{ height: `${totalMilestones ? (completedMilestones / totalMilestones) * 100 : 0}%` }}></div>
                <span className="bar-label">Completed</span>
                <span className="bar-value">{completedMilestones}</span>
              </div>
              <div className="chart-bar">
                <div className="bar-fill in-progress" style={{ height: `${totalMilestones ? (inProgressMilestones / totalMilestones) * 100 : 0}%` }}></div>
                <span className="bar-label">In Progress</span>
                <span className="bar-value">{inProgressMilestones}</span>
              </div>
              <div className="chart-bar">
                <div className="bar-fill pending" style={{ height: `${totalMilestones ? (pendingMilestones / totalMilestones) * 100 : 0}%` }}></div>
                <span className="bar-label">Pending</span>
                <span className="bar-value">{pendingMilestones}</span>
              </div>
            </div>
          </div>
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
                    <span className="task-count">{tasks} tasks</span>
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
                  <span className={`status-badge ${project.status}`}>
                    {project.status}
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

