import { useState } from 'react';
import { useProjects } from '../store/ProjectContext';
import { 
  Search, 
  Filter, 
  ChevronUp, 
  ChevronDown,
  Calendar,
  Users,
  Flag,
  Package,
  ExternalLink
} from 'lucide-react';
import { format, parseISO, isBefore } from 'date-fns';

const PRIORITY_CONFIG = {
  critical: { label: 'Critical', color: '#ef4444', order: 0 },
  high: { label: 'High', color: '#f97316', order: 1 },
  medium: { label: 'Medium', color: '#eab308', order: 2 },
  low: { label: 'Low', color: '#22c55e', order: 3 },
};

const SIZE_CONFIG = {
  xs: { label: 'XS', description: 'Extra Small' },
  s: { label: 'S', description: 'Small' },
  m: { label: 'M', description: 'Medium' },
  l: { label: 'L', description: 'Large' },
  xl: { label: 'XL', description: 'Extra Large' },
};

export default function Portfolio({ onNavigate }) {
  const { projects, teams = [], teamMembers = [] } = useProjects();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState('name');
  const [sortDirection, setSortDirection] = useState('asc');
  const [filterPriority, setFilterPriority] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterTeam, setFilterTeam] = useState('all');
  
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };
  
  const filteredAndSortedProjects = (projects || [])
    .filter(project => {
      const matchesSearch = project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        project.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        project.deliverables?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesPriority = filterPriority === 'all' || project.priority === filterPriority;
      const matchesStatus = filterStatus === 'all' || project.status === filterStatus;
      const matchesTeam = filterTeam === 'all' || project.teamId === filterTeam;
      
      return matchesSearch && matchesPriority && matchesStatus && matchesTeam;
    })
    .sort((a, b) => {
      let comparison = 0;
      
      switch (sortField) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'priority':
          comparison = (PRIORITY_CONFIG[a.priority]?.order ?? 99) - (PRIORITY_CONFIG[b.priority]?.order ?? 99);
          break;
        case 'dueDate':
          if (!a.dueDate && !b.dueDate) comparison = 0;
          else if (!a.dueDate) comparison = 1;
          else if (!b.dueDate) comparison = -1;
          else comparison = new Date(a.dueDate) - new Date(b.dueDate);
          break;
        case 'status':
          comparison = (a.status || '').localeCompare(b.status || '');
          break;
        case 'size':
          const sizeOrder = { xs: 0, s: 1, m: 2, l: 3, xl: 4 };
          comparison = (sizeOrder[a.size] ?? 99) - (sizeOrder[b.size] ?? 99);
          break;
        case 'progress':
          const aProgress = a.milestones?.length ? 
            (a.milestones.filter(m => m.status === 'completed').length / a.milestones.length) : 0;
          const bProgress = b.milestones?.length ? 
            (b.milestones.filter(m => m.status === 'completed').length / b.milestones.length) : 0;
          comparison = aProgress - bProgress;
          break;
        default:
          comparison = 0;
      }
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  
  const SortIcon = ({ field }) => {
    if (sortField !== field) return <ChevronUp size={14} className="sort-icon inactive" />;
    return sortDirection === 'asc' ? 
      <ChevronUp size={14} className="sort-icon" /> : 
      <ChevronDown size={14} className="sort-icon" />;
  };

  return (
    <div className="portfolio-page">
      <header className="page-header">
        <div>
          <h1>Portfolio Tracker</h1>
          <p className="subtitle">Complete overview of all projects and their details</p>
        </div>
      </header>
      
      <div className="portfolio-toolbar">
        <div className="search-box">
          <Search size={18} />
          <input
            type="text"
            placeholder="Search projects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <div className="filter-group">
          <Filter size={16} />
          <select 
            value={filterTeam} 
            onChange={(e) => setFilterTeam(e.target.value)}
          >
            <option value="all">All Teams</option>
            {teams.map(team => (
              <option key={team.id} value={team.id}>{team.icon} {team.name}</option>
            ))}
          </select>
          
          <select 
            value={filterPriority} 
            onChange={(e) => setFilterPriority(e.target.value)}
          >
            <option value="all">All Priorities</option>
            {Object.entries(PRIORITY_CONFIG).map(([key, config]) => (
              <option key={key} value={key}>{config.label}</option>
            ))}
          </select>
          
          <select 
            value={filterStatus} 
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="on-hold">On Hold</option>
            <option value="completed">Completed</option>
          </select>
        </div>
        
        <div className="project-count">
          {filteredAndSortedProjects.length} of {projects.length} projects
        </div>
      </div>
      
      {filteredAndSortedProjects.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📋</div>
          <h3>No projects found</h3>
          <p>
            {projects.length === 0 
              ? "Create your first project to see it in the portfolio"
              : "Try adjusting your search or filters"}
          </p>
        </div>
      ) : (
        <div className="portfolio-table-container">
          <table className="portfolio-table">
            <thead>
              <tr>
                <th onClick={() => handleSort('name')} className="sortable">
                  <span>Project Name</span>
                  <SortIcon field="name" />
                </th>
                <th>Deliverables</th>
                <th onClick={() => handleSort('priority')} className="sortable">
                  <span>Priority</span>
                  <SortIcon field="priority" />
                </th>
                <th onClick={() => handleSort('dueDate')} className="sortable">
                  <span>Due Date</span>
                  <SortIcon field="dueDate" />
                </th>
                <th>Team</th>
                <th onClick={() => handleSort('size')} className="sortable">
                  <span>Size</span>
                  <SortIcon field="size" />
                </th>
                <th onClick={() => handleSort('status')} className="sortable">
                  <span>Status</span>
                  <SortIcon field="status" />
                </th>
                <th onClick={() => handleSort('progress')} className="sortable">
                  <span>Progress</span>
                  <SortIcon field="progress" />
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredAndSortedProjects.map(project => {
                const projectTeam = teams.find(t => t.id === project.teamId);
                const completedMilestones = project.milestones?.filter(m => m.status === 'completed').length || 0;
                const totalMilestones = project.milestones?.length || 0;
                const progress = totalMilestones > 0 ? Math.round((completedMilestones / totalMilestones) * 100) : 0;
                const isOverdue = project.dueDate && project.status !== 'completed' && 
                  isBefore(parseISO(project.dueDate), new Date());
                const priorityConfig = PRIORITY_CONFIG[project.priority];
                const sizeConfig = SIZE_CONFIG[project.size];
                
                return (
                  <tr key={project.id} className={isOverdue ? 'overdue' : ''}>
                    <td className="project-name-cell">
                      <div 
                        className="project-color-dot" 
                        style={{ backgroundColor: project.color || '#6366f1' }}
                      />
                      <button 
                        className="project-link"
                        onClick={() => onNavigate('project', project.id)}
                      >
                        {project.name}
                        <ExternalLink size={14} />
                      </button>
                    </td>
                    <td className="deliverables-cell">
                      <div className="deliverables-content">
                        {project.deliverables || <span className="no-data">—</span>}
                      </div>
                    </td>
                    <td>
                      {priorityConfig ? (
                        <span 
                          className="priority-tag"
                          style={{ 
                            backgroundColor: `${priorityConfig.color}20`,
                            color: priorityConfig.color,
                            borderColor: `${priorityConfig.color}40`
                          }}
                        >
                          <Flag size={12} />
                          {priorityConfig.label}
                        </span>
                      ) : (
                        <span className="no-data">—</span>
                      )}
                    </td>
                    <td>
                      {project.dueDate ? (
                        <span className={`due-date-cell ${isOverdue ? 'overdue' : ''}`}>
                          <Calendar size={14} />
                          {format(parseISO(project.dueDate), 'MMM d, yyyy')}
                        </span>
                      ) : (
                        <span className="no-data">—</span>
                      )}
                    </td>
                    <td>
                      {projectTeam ? (
                        <span 
                          className="team-tag"
                          style={{ 
                            backgroundColor: `${projectTeam.color}20`,
                            color: projectTeam.color,
                            borderColor: `${projectTeam.color}40`
                          }}
                        >
                          <Users size={12} />
                          {projectTeam.name}
                        </span>
                      ) : (
                        <span className="no-data">—</span>
                      )}
                    </td>
                    <td>
                      {sizeConfig ? (
                        <span className="size-tag" title={sizeConfig.description}>
                          <Package size={12} />
                          {sizeConfig.label}
                        </span>
                      ) : (
                        <span className="no-data">—</span>
                      )}
                    </td>
                    <td>
                      <span className={`status-badge ${project.status}`}>
                        {project.status}
                      </span>
                    </td>
                    <td>
                      <div className="progress-cell">
                        <div className="mini-progress-bar">
                          <div 
                            className="mini-progress-fill" 
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <span className="progress-text">{progress}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

