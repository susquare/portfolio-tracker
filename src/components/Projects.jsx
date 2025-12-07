import { useState } from 'react';
import { useProjects, useProjectDispatch } from '../store/ProjectContext';
import { 
  Plus, 
  MoreVertical, 
  Trash2, 
  Edit3, 
  Calendar,
  Target,
  ChevronRight
} from 'lucide-react';
import { format, parseISO } from 'date-fns';

const PROJECT_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', 
  '#f97316', '#eab308', '#22c55e', '#14b8a6', 
  '#06b6d4', '#3b82f6'
];

export default function Projects({ onNavigate, showNewProjectModal }) {
  const { projects } = useProjects();
  const dispatch = useProjectDispatch();
  const [filter, setFilter] = useState('all');
  const [menuOpen, setMenuOpen] = useState(null);
  
  const filteredProjects = projects.filter(p => {
    if (filter === 'all') return true;
    return p.status === filter;
  });
  
  const handleDelete = (id) => {
    if (confirm('Are you sure you want to delete this project?')) {
      dispatch({ type: 'DELETE_PROJECT', id });
    }
    setMenuOpen(null);
  };
  
  return (
    <div className="projects-page">
      <header className="page-header">
        <div>
          <h1>Projects</h1>
          <p className="subtitle">Manage and track all your projects</p>
        </div>
        <button className="primary-btn" onClick={showNewProjectModal}>
          <Plus size={20} />
          New Project
        </button>
      </header>
      
      <div className="filter-bar">
        <button 
          className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          All ({projects.length})
        </button>
        <button 
          className={`filter-btn ${filter === 'active' ? 'active' : ''}`}
          onClick={() => setFilter('active')}
        >
          Active ({projects.filter(p => p.status === 'active').length})
        </button>
        <button 
          className={`filter-btn ${filter === 'on-hold' ? 'active' : ''}`}
          onClick={() => setFilter('on-hold')}
        >
          On Hold ({projects.filter(p => p.status === 'on-hold').length})
        </button>
        <button 
          className={`filter-btn ${filter === 'completed' ? 'active' : ''}`}
          onClick={() => setFilter('completed')}
        >
          Completed ({projects.filter(p => p.status === 'completed').length})
        </button>
      </div>
      
      {filteredProjects.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📁</div>
          <h3>No projects yet</h3>
          <p>Create your first project to get started tracking milestones</p>
          <button className="primary-btn" onClick={showNewProjectModal}>
            <Plus size={20} />
            Create Project
          </button>
        </div>
      ) : (
        <div className="projects-grid">
          {filteredProjects.map(project => {
            const completedMilestones = project.milestones?.filter(m => m.status === 'completed').length || 0;
            const totalMilestones = project.milestones?.length || 0;
            const progress = totalMilestones > 0 ? (completedMilestones / totalMilestones) * 100 : 0;
            
            return (
              <div 
                key={project.id} 
                className="project-card"
                onClick={() => onNavigate('project', project.id)}
              >
                <div className="project-card-header">
                  <div 
                    className="project-color-bar" 
                    style={{ backgroundColor: project.color || '#6366f1' }}
                  ></div>
                  <div className="project-menu" onClick={(e) => e.stopPropagation()}>
                    <button 
                      className="menu-trigger"
                      onClick={() => setMenuOpen(menuOpen === project.id ? null : project.id)}
                    >
                      <MoreVertical size={18} />
                    </button>
                    {menuOpen === project.id && (
                      <div className="dropdown-menu">
                        <button onClick={() => onNavigate('project', project.id)}>
                          <Edit3 size={16} />
                          Edit
                        </button>
                        <button className="danger" onClick={() => handleDelete(project.id)}>
                          <Trash2 size={16} />
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="project-card-body">
                  <h3>{project.name}</h3>
                  <p className="project-description">{project.description || 'No description'}</p>
                  
                  <div className="project-stats">
                    <div className="stat">
                      <Target size={16} />
                      <span>{totalMilestones} milestones</span>
                    </div>
                    {project.dueDate && (
                      <div className="stat">
                        <Calendar size={16} />
                        <span>{format(parseISO(project.dueDate), 'MMM d, yyyy')}</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="progress-section">
                    <div className="progress-header">
                      <span>Progress</span>
                      <span>{Math.round(progress)}%</span>
                    </div>
                    <div className="progress-bar">
                      <div 
                        className="progress-fill" 
                        style={{ width: `${progress}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
                
                <div className="project-card-footer">
                  <span className={`status-badge ${project.status}`}>
                    {project.status}
                  </span>
                  <ChevronRight size={18} className="chevron" />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

