import { useState } from 'react';
import { useProjects, useProjectDispatch } from '../store/ProjectContext';
import { 
  Search, 
  Filter, 
  ChevronUp, 
  ChevronDown,
  Calendar,
  Users,
  Flag,
  Package,
  ExternalLink,
  CheckCircle2
} from 'lucide-react';
import { format, parseISO, isBefore } from 'date-fns';
import { calculateProjectProgress } from '../utils/progress';

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

const PORTFOLIO_INTAKE_CONFIG = {
  new: { label: 'New', color: '#6366f1' },
  'in-review': { label: 'In Review', color: '#f59e0b' },
  approved: { label: 'Approved', color: '#22c55e' },
};

export default function ProjectPipeline({ onNavigate }) {
  const { projects, teams = [], teamMembers = [] } = useProjects();
  const dispatch = useProjectDispatch();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState('name');
  const [sortDirection, setSortDirection] = useState('asc');
  const [filterPriority, setFilterPriority] = useState('all');
  const [filterIntake, setFilterIntake] = useState('all');
  const [filterTeam, setFilterTeam] = useState('all');
  
  const handleIntakeStatusChange = (projectId, newStatus, e) => {
    e.stopPropagation(); // Prevent row click navigation
    
    const project = projects.find(p => p.id === projectId);
    if (!project) return;
    
    dispatch({ 
      type: 'UPDATE_PROJECT', 
      id: projectId, 
      updates: { portfolioIntake: newStatus } 
    });
    
    // If approved, the project will automatically disappear from pipeline
    // and appear in Portfolio (since Portfolio filters by approved)
    if (newStatus === 'approved') {
      // Optional: Could navigate to portfolio or show notification
      // For now, the automatic removal from pipeline is sufficient feedback
    }
  };
  
  // Filter to show only non-approved projects
  const pipelineProjects = (projects || []).filter(p => p.portfolioIntake !== 'approved');
  
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };
  
  const filteredAndSortedProjects = pipelineProjects
    .filter(project => {
      const matchesSearch = project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        project.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        project.deliverables?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesPriority = filterPriority === 'all' || project.priority === filterPriority;
      const matchesIntake = filterIntake === 'all' || project.portfolioIntake === filterIntake;
      const matchesTeam = filterTeam === 'all' || project.teamId === filterTeam;
      
      return matchesSearch && matchesPriority && matchesIntake && matchesTeam;
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
        case 'portfolioIntake':
          const intakeOrder = { 'new': 0, 'in-review': 1, 'approved': 2 };
          comparison = (intakeOrder[a.portfolioIntake] ?? 99) - (intakeOrder[b.portfolioIntake] ?? 99);
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
          <h1>Project Pipeline</h1>
          <p className="subtitle">Projects pending approval and in review</p>
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
            value={filterIntake} 
            onChange={(e) => setFilterIntake(e.target.value)}
          >
            <option value="all">All Intake Status</option>
            <option value="new">New</option>
            <option value="in-review">In Review</option>
          </select>
        </div>
        
        <div className="project-count">
          {filteredAndSortedProjects.length} project{filteredAndSortedProjects.length !== 1 ? 's' : ''} in pipeline
        </div>
      </div>
      
      {filteredAndSortedProjects.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📋</div>
          <h3>No projects in pipeline</h3>
          <p>All projects are approved or no projects match your filters</p>
        </div>
      ) : (
        <div className="portfolio-table-container">
          <table className="portfolio-table">
            <thead>
              <tr>
                <th onClick={() => handleSort('name')} className="sortable">
                  Project Name <SortIcon field="name" />
                </th>
                <th onClick={() => handleSort('portfolioIntake')} className="sortable">
                  Intake Status <SortIcon field="portfolioIntake" />
                </th>
                <th>Deliverables</th>
                <th onClick={() => handleSort('priority')} className="sortable">
                  Priority <SortIcon field="priority" />
                </th>
                <th onClick={() => handleSort('dueDate')} className="sortable">
                  Due Date <SortIcon field="dueDate" />
                </th>
                <th>Team</th>
                <th>Team Lead</th>
                <th>Size</th>
              </tr>
            </thead>
            <tbody>
              {filteredAndSortedProjects.map(project => {
                const projectTeam = teams.find(t => t.id === project.teamId);
                const teamLead = teamMembers.find(m => m.id === project.teamLeadId);
                const intakeConfig = PORTFOLIO_INTAKE_CONFIG[project.portfolioIntake] || PORTFOLIO_INTAKE_CONFIG.new;
                const isOverdue = project.dueDate && isBefore(parseISO(project.dueDate), new Date());
                const priorityConfig = PRIORITY_CONFIG[project.priority];
                const sizeConfig = SIZE_CONFIG[project.size];
                
                return (
                  <tr 
                    key={project.id} 
                    className={isOverdue ? 'overdue' : ''}
                    onClick={() => onNavigate('project', project.id)}
                  >
                    <td>
                      <div className="project-name-cell">
                        <div 
                          className="project-color-indicator" 
                          style={{ backgroundColor: project.color || '#6366f1' }}
                        ></div>
                        <span className="project-name">{project.name}</span>
                      </div>
                    </td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <select
                        className="intake-status-select"
                        value={project.portfolioIntake || 'new'}
                        onChange={(e) => handleIntakeStatusChange(project.id, e.target.value, e)}
                        style={{
                          backgroundColor: `${intakeConfig.color}20`,
                          color: intakeConfig.color,
                          borderColor: `${intakeConfig.color}40`
                        }}
                      >
                        <option value="new">New</option>
                        <option value="in-review">In Review</option>
                        <option value="approved">Approved</option>
                      </select>
                    </td>
                    <td>
                      <span className="deliverables-text">
                        {project.deliverables || 'N/A'}
                      </span>
                    </td>
                    <td>
                      <span 
                        className="priority-badge" 
                        style={{ 
                          backgroundColor: `${priorityConfig.color}20`,
                          color: priorityConfig.color
                        }}
                      >
                        <Flag size={12} />
                        {priorityConfig.label}
                      </span>
                    </td>
                    <td>
                      {project.dueDate ? (
                        <span className={isOverdue ? 'overdue-date' : ''}>
                          <Calendar size={14} />
                          {format(parseISO(project.dueDate), 'MMM d, yyyy')}
                        </span>
                      ) : (
                        <span className="no-date">No date</span>
                      )}
                    </td>
                    <td>
                      {projectTeam ? (
                        <span className="team-badge">
                          {projectTeam.icon} {projectTeam.name}
                        </span>
                      ) : (
                        <span className="no-team">Unassigned</span>
                      )}
                    </td>
                    <td>
                      {teamLead ? (
                        <span className="team-lead">
                          {teamLead.avatar} {teamLead.name}
                        </span>
                      ) : (
                        <span className="no-lead">No lead</span>
                      )}
                    </td>
                    <td>
                      <span className="size-badge">
                        <Package size={12} />
                        {sizeConfig.label}
                      </span>
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

