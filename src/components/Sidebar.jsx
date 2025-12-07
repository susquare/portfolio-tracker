import { useState, useMemo, useEffect } from 'react';
import { LayoutDashboard, FolderKanban, Plus, LayoutGrid, Sun, Moon, ChevronRight, ChevronDown } from 'lucide-react';
import { useTheme } from '../store/ThemeContext';
import { useProjects } from '../store/ProjectContext';

export default function Sidebar({ currentView, selectedProjectId, onNavigate, onNewProject }) {
  const { theme, toggleTheme } = useTheme();
  const { teams = [], projects = [] } = useProjects();
  const [isProjectsExpanded, setIsProjectsExpanded] = useState(true);
  const [expandedTeams, setExpandedTeams] = useState({});

  // Initialize expanded teams when teams change
  useEffect(() => {
    setExpandedTeams(prev => {
      const newState = { ...prev };
      teams.forEach(team => {
        if (newState[team.id] === undefined) {
          newState[team.id] = true; // Default to expanded
        }
      });
      return newState;
    });
  }, [teams]);

  // Auto-expand team when a project is selected
  useEffect(() => {
    if (selectedProjectId) {
      const selectedProject = projects.find(p => p.id === selectedProjectId);
      if (selectedProject && selectedProject.teamId) {
        setExpandedTeams(prev => ({
          ...prev,
          [selectedProject.teamId]: true,
        }));
        setIsProjectsExpanded(true);
      }
    }
  }, [selectedProjectId, projects]);

  const projectsByTeam = useMemo(() => {
    return teams.map(team => ({
      ...team,
      projects: projects.filter(project => project.teamId === team.id),
    }));
  }, [teams, projects]);

  const toggleTeam = (teamId) => {
    setExpandedTeams(prev => ({
      ...prev,
      [teamId]: !prev[teamId],
    }));
  };

  const handleProjectsClick = () => {
    if (currentView === 'projects') {
      setIsProjectsExpanded(!isProjectsExpanded);
    } else {
      onNavigate('projects');
      setIsProjectsExpanded(true);
    }
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="logo">
          <span className="logo-icon">◈</span>
          <span className="logo-text">ProjectFlow</span>
        </div>
      </div>
      
      <nav className="sidebar-nav">
        <button
          className={`nav-item ${currentView === 'dashboard' ? 'active' : ''}`}
          onClick={() => onNavigate('dashboard')}
        >
          <LayoutDashboard size={20} />
          <span>Dashboard</span>
        </button>
        
        <button
          className={`nav-item ${currentView === 'portfolio' ? 'active' : ''}`}
          onClick={() => onNavigate('portfolio')}
        >
          <LayoutGrid size={20} />
          <span>Portfolio</span>
        </button>
        
        <div className="nav-group">
          <button
            className={`nav-item nav-item-expandable ${currentView === 'projects' ? 'active' : ''}`}
            onClick={handleProjectsClick}
          >
            <FolderKanban size={20} />
            <span>Projects</span>
            {isProjectsExpanded ? (
              <ChevronDown size={16} className="expand-icon" />
            ) : (
              <ChevronRight size={16} className="expand-icon" />
            )}
          </button>
          
          {isProjectsExpanded && (
            <div className="nav-sublinks">
              {projectsByTeam.length === 0 ? (
                <div className="sidebar-empty">No projects yet</div>
              ) : (
                projectsByTeam.map(team => (
                  <div key={team.id} className="nav-team-group">
                    <button
                      className="nav-team-header"
                      onClick={() => toggleTeam(team.id)}
                    >
                      {expandedTeams[team.id] ? (
                        <ChevronDown size={14} />
                      ) : (
                        <ChevronRight size={14} />
                      )}
                      <span className="team-icon">{team.icon}</span>
                      <span className="team-name">{team.name}</span>
                      <span className="team-count">({team.projects.length})</span>
                    </button>
                    
                    {expandedTeams[team.id] && team.projects.length > 0 && (
                      <ul className="nav-project-list">
                        {team.projects.map(project => (
                          <li key={project.id}>
                            <button
                              className={`nav-project-item ${
                                selectedProjectId === project.id ? 'active' : ''
                              }`}
                              onClick={() => onNavigate('project', project.id)}
                            >
                              <span className="project-dot"></span>
                              <span className="project-name">{project.name}</span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </nav>

      <div className="sidebar-footer">
        <button className="theme-toggle" onClick={toggleTheme} title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
        </button>
        
        <button className="new-project-btn" onClick={onNewProject}>
          <Plus size={20} />
          <span>New Project</span>
        </button>
      </div>
    </aside>
  );
}
