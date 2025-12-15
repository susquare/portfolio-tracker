import { useState } from 'react';
import { useProjects, useProjectDispatch } from '../store/ProjectContext';
import { 
  ArrowLeft, 
  Plus, 
  Edit3, 
  Trash2, 
  Calendar,
  User,
  CheckCircle2,
  Clock,
  AlertCircle,
  MoreVertical,
  Target,
  Flag,
  Users,
  Package,
  FileText,
  BarChart3,
  TrendingUp,
  AlertTriangle,
  ChevronRight,
  ChevronDown
} from 'lucide-react';
import { format, parseISO, isBefore } from 'date-fns';
import GanttChart from './GanttChart';
import StatusUpdates from './StatusUpdates';
import { calculateMilestoneProgress, calculateProjectProgress } from '../utils/progress';

const MILESTONE_STATUSES = [
  { value: 'pending', label: 'Pending', icon: Clock, color: '#94a3b8' },
  { value: 'in-progress', label: 'In Progress', icon: AlertCircle, color: '#f59e0b' },
  { value: 'completed', label: 'Completed', icon: CheckCircle2, color: '#22c55e' },
];

const TASK_STATUSES = [
  { value: 'pending', label: 'Pending', icon: Clock, color: '#94a3b8' },
  { value: 'in-progress', label: 'In Progress', icon: AlertCircle, color: '#f59e0b' },
  { value: 'completed', label: 'Completed', icon: CheckCircle2, color: '#22c55e' },
];

const PRIORITIES = [
  { value: 'low', label: 'Low', color: '#22c55e' },
  { value: 'medium', label: 'Medium', color: '#eab308' },
  { value: 'high', label: 'High', color: '#f97316' },
  { value: 'critical', label: 'Critical', color: '#ef4444' },
];

const PROJECT_PRIORITIES = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
];

const SIZES = [
  { value: 'xs', label: 'XS', description: 'Extra Small' },
  { value: 's', label: 'S', description: 'Small' },
  { value: 'm', label: 'M', description: 'Medium' },
  { value: 'l', label: 'L', description: 'Large' },
  { value: 'xl', label: 'XL', description: 'Extra Large' },
];

const PROJECT_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', 
  '#f97316', '#eab308', '#22c55e', '#14b8a6', 
  '#06b6d4', '#3b82f6'
];

export default function ProjectDetail({ projectId, onBack }) {
  const { projects, teams, teamMembers } = useProjects();
  const dispatch = useProjectDispatch();
  const project = projects.find(p => p.id === projectId);
  
  const [showMilestoneModal, setShowMilestoneModal] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState(null);
  const [menuOpen, setMenuOpen] = useState(null);
  const [editingProject, setEditingProject] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [taskMilestoneId, setTaskMilestoneId] = useState(null);
  const [expandedMilestones, setExpandedMilestones] = useState({});
  
  if (!project) {
    return (
      <div className="not-found">
        <h2>Project not found</h2>
        <button onClick={onBack}>Go back</button>
      </div>
    );
  }
  
  const handleUpdateProject = (updates) => {
    dispatch({ type: 'UPDATE_PROJECT', id: projectId, updates });
    setEditingProject(false);
  };
  
  const handleAddMilestone = (milestoneData) => {
    dispatch({ type: 'ADD_MILESTONE', projectId, milestone: milestoneData });
    setShowMilestoneModal(false);
  };
  
  const handleUpdateMilestone = (milestoneId, updates) => {
    dispatch({ type: 'UPDATE_MILESTONE', projectId, milestoneId, updates });
    setEditingMilestone(null);
  };
  
  const handleDeleteMilestone = (milestoneId) => {
    if (confirm('Are you sure you want to delete this milestone?')) {
      dispatch({ type: 'DELETE_MILESTONE', projectId, milestoneId });
    }
    setMenuOpen(null);
  };
  
  const handleStatusChange = (milestoneId, newStatus) => {
    dispatch({ 
      type: 'UPDATE_MILESTONE', 
      projectId, 
      milestoneId, 
      updates: { 
        status: newStatus,
        completedAt: newStatus === 'completed' ? new Date().toISOString() : null
      }
    });
  };
  
  const handleAddTask = (milestoneId, taskData) => {
    dispatch({ type: 'ADD_TASK', projectId, milestoneId, task: taskData });
    setShowTaskModal(false);
    setTaskMilestoneId(null);
  };
  
  const handleUpdateTask = (milestoneId, taskId, updates) => {
    dispatch({ type: 'UPDATE_TASK', projectId, milestoneId, taskId, updates });
    setEditingTask(null);
    setTaskMilestoneId(null);
  };
  
  const handleDeleteTask = (milestoneId, taskId) => {
    if (confirm('Are you sure you want to delete this task?')) {
      dispatch({ type: 'DELETE_TASK', projectId, milestoneId, taskId });
    }
  };
  
  const toggleMilestoneExpanded = (milestoneId) => {
    setExpandedMilestones(prev => ({
      ...prev,
      [milestoneId]: !prev[milestoneId],
    }));
  };
  
  const handleAddStatusUpdate = (update) => {
    dispatch({ type: 'ADD_STATUS_UPDATE', projectId, update });
  };
  
  const handleDeleteStatusUpdate = (updateId) => {
    if (confirm('Are you sure you want to delete this status update?')) {
      dispatch({ type: 'DELETE_STATUS_UPDATE', projectId, updateId });
    }
  };
  
  // Calculate metrics
  const milestones = project.milestones || [];
  const totalCount = milestones.length;
  const completedCount = milestones.filter(m => m.status === 'completed').length;
  const inProgressCount = milestones.filter(m => m.status === 'in-progress').length;
  const pendingCount = milestones.filter(m => m.status === 'pending').length;
  const overdueCount = milestones.filter(m => 
    m.status !== 'completed' && m.dueDate && isBefore(parseISO(m.dueDate), new Date())
  ).length;
  // Calculate project progress based on total task effort across all milestones
  const progress = calculateProjectProgress(project);
  
  const sortedMilestones = [...milestones].sort((a, b) => {
    const statusOrder = { 'in-progress': 0, 'pending': 1, 'completed': 2 };
    return statusOrder[a.status] - statusOrder[b.status];
  });
  
  const priorityConfig = PRIORITIES.find(p => p.value === project.priority);
  const sizeConfig = SIZES.find(s => s.value === project.size);
  
  // Get latest status update health
  const latestUpdate = (project.statusUpdates || [])[0];
  const healthStatus = latestUpdate?.health || 'on-track';

  return (
    <div className="project-detail">
      <header className="detail-header">
        <button className="back-btn" onClick={onBack}>
          <ArrowLeft size={20} />
          Back to Projects
        </button>
      </header>
      
      <div className="project-hero" style={{ borderColor: project.color || '#6366f1' }}>
        <div className="hero-content">
          <div className="hero-main">
            <h1>{project.name}</h1>
            <p className="project-description">{project.description || 'No description provided'}</p>
            
            {project.deliverables && (
              <div className="project-deliverables">
                <FileText size={16} />
                <span><strong>Deliverables:</strong> {project.deliverables}</span>
              </div>
            )}
            
            <div className="project-meta">
              <span className={`status-badge large intake-${project.portfolioIntake || 'new'}`}>
                {project.portfolioIntake === 'new' ? 'New' :
                 project.portfolioIntake === 'in-review' ? 'In Review' :
                 project.portfolioIntake === 'approved' ? 'Approved' : 'New'}
              </span>
              
              {priorityConfig && (
                <span 
                  className="meta-item priority-item"
                  style={{ color: priorityConfig.color }}
                >
                  <Flag size={16} />
                  {priorityConfig.label} Priority
                </span>
              )}
              
              {sizeConfig && (
                <span className="meta-item">
                  <Package size={16} />
                  Size: {sizeConfig.label}
                </span>
              )}
              
              {project.dueDate && (
                <span className="meta-item">
                  <Calendar size={16} />
                  Due {format(parseISO(project.dueDate), 'MMMM d, yyyy')}
                </span>
              )}
              
              <span className="meta-item">
                <Target size={16} />
                {totalCount} milestones
              </span>
            </div>
            
            {project.teamId && (
              <div className="project-team-section">
                <div className="team-display">
                  <span className="team-label">Assigned Team:</span>
                  {(() => {
                    const team = teams.find(t => t.id === project.teamId);
                    return team ? (
                      <span 
                        className="team-badge-large"
                        style={{ 
                          backgroundColor: `${team.color}20`,
                          color: team.color,
                          borderColor: `${team.color}40`
                        }}
                      >
                        <Users size={16} />
                        {team.name}
                      </span>
                    ) : null;
                  })()}
                </div>
              </div>
            )}
          </div>
          
          <div className="hero-progress">
            <div className="progress-ring">
              <svg viewBox="0 0 100 100">
                <circle 
                  cx="50" cy="50" r="45" 
                  fill="none" 
                  stroke="var(--bg-secondary)" 
                  strokeWidth="8"
                />
                <circle 
                  cx="50" cy="50" r="45" 
                  fill="none" 
                  stroke={project.color || '#6366f1'}
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={`${progress * 2.83} 283`}
                  transform="rotate(-90 50 50)"
                />
              </svg>
              <div className="progress-text">
                <span className="progress-value">{Math.round(progress)}%</span>
                <span className="progress-label">Complete</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="hero-actions">
          <button className="secondary-btn" onClick={() => setEditingProject(true)}>
            <Edit3 size={18} />
            Edit Project
          </button>
          <select 
            className="status-select"
            value={project.status}
            onChange={(e) => handleUpdateProject({ status: e.target.value })}
          >
            <option value="active">Active</option>
            <option value="on-hold">On Hold</option>
            <option value="completed">Completed</option>
          </select>
        </div>
      </div>
      
      {/* Status Overview Cards */}
      <div className="status-overview">
        <div className="status-card">
          <div className="status-card-icon planned">
            <Target size={20} />
          </div>
          <div className="status-card-content">
            <span className="status-card-value">{totalCount}</span>
            <span className="status-card-label">Total Planned</span>
          </div>
        </div>
        
        <div className="status-card">
          <div className="status-card-icon completed">
            <CheckCircle2 size={20} />
          </div>
          <div className="status-card-content">
            <span className="status-card-value">{completedCount}</span>
            <span className="status-card-label">Completed</span>
          </div>
        </div>
        
        <div className="status-card">
          <div className="status-card-icon in-progress">
            <Clock size={20} />
          </div>
          <div className="status-card-content">
            <span className="status-card-value">{inProgressCount}</span>
            <span className="status-card-label">In Progress</span>
          </div>
        </div>
        
        <div className="status-card">
          <div className="status-card-icon pending">
            <BarChart3 size={20} />
          </div>
          <div className="status-card-content">
            <span className="status-card-value">{pendingCount}</span>
            <span className="status-card-label">Pending</span>
          </div>
        </div>
        
        <div className="status-card">
          <div className={`status-card-icon ${overdueCount > 0 ? 'overdue' : 'success'}`}>
            <AlertTriangle size={20} />
          </div>
          <div className="status-card-content">
            <span className="status-card-value">{overdueCount}</span>
            <span className="status-card-label">Overdue</span>
          </div>
        </div>
      </div>
      
      {/* Tabs */}
      <div className="project-tabs">
        <button 
          className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          <BarChart3 size={16} />
          Gantt Chart
        </button>
        <button 
          className={`tab-btn ${activeTab === 'milestones' ? 'active' : ''}`}
          onClick={() => setActiveTab('milestones')}
        >
          <Target size={16} />
          Milestones
        </button>
        <button 
          className={`tab-btn ${activeTab === 'updates' ? 'active' : ''}`}
          onClick={() => setActiveTab('updates')}
        >
          <TrendingUp size={16} />
          Status Updates
          {(project.statusUpdates || []).length > 0 && (
            <span className="tab-count">{project.statusUpdates.length}</span>
          )}
        </button>
      </div>
      
      {/* Tab Content */}
      {activeTab === 'overview' && (
        <section className="gantt-section">
          <div className="section-header">
            <h2>
              <BarChart3 size={20} />
              Project Timeline
            </h2>
          </div>
          <GanttChart milestones={milestones} projectColor={project.color} />
        </section>
      )}
      
      {activeTab === 'milestones' && (
        <section className="milestones-section">
          <div className="section-header">
            <h2>Milestones</h2>
            <button className="primary-btn" onClick={() => setShowMilestoneModal(true)}>
              <Plus size={20} />
              Add Milestone
            </button>
          </div>
          
          {sortedMilestones.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🎯</div>
              <h3>No milestones yet</h3>
              <p>Break down your project into milestones to track progress</p>
              <button className="primary-btn" onClick={() => setShowMilestoneModal(true)}>
                <Plus size={20} />
                Add First Milestone
              </button>
            </div>
          ) : (
            <div className="milestones-list">
              {sortedMilestones.map(milestone => {
                const StatusIcon = MILESTONE_STATUSES.find(s => s.value === milestone.status)?.icon || Clock;
                const isOverdue = milestone.dueDate && 
                  milestone.status !== 'completed' && 
                  isBefore(parseISO(milestone.dueDate), new Date());
                const assignee = teamMembers.find(m => m.id === milestone.assigneeId);
                const priority = PRIORITIES.find(p => p.value === milestone.priority);
                
                return (
                  <div 
                    key={milestone.id} 
                    className={`milestone-card ${milestone.status} ${isOverdue ? 'overdue' : ''}`}
                  >
                    <div className="milestone-status-indicator">
                      <button
                        className="status-toggle"
                        onClick={() => {
                          const currentIndex = MILESTONE_STATUSES.findIndex(s => s.value === milestone.status);
                          const nextIndex = (currentIndex + 1) % MILESTONE_STATUSES.length;
                          handleStatusChange(milestone.id, MILESTONE_STATUSES[nextIndex].value);
                        }}
                      >
                        <StatusIcon 
                          size={22} 
                          style={{ color: MILESTONE_STATUSES.find(s => s.value === milestone.status)?.color }}
                        />
                      </button>
                    </div>
                    
                    <div className="milestone-content">
                      <div className="milestone-header">
                        <div className="milestone-title-section">
                          <h4 className={milestone.status === 'completed' ? 'completed' : ''}>
                            {milestone.title}
                          </h4>
                          {milestone.tasks && milestone.tasks.length > 0 && (
                            <span className="milestone-progress-badge">
                              {calculateMilestoneProgress(milestone)}%
                            </span>
                          )}
                        </div>
                        <div className="milestone-menu" onClick={(e) => e.stopPropagation()}>
                          <button 
                            className="menu-trigger"
                            onClick={() => setMenuOpen(menuOpen === milestone.id ? null : milestone.id)}
                          >
                            <MoreVertical size={18} />
                          </button>
                          {menuOpen === milestone.id && (
                            <div className="dropdown-menu">
                              <button onClick={() => {
                                setEditingMilestone(milestone);
                                setMenuOpen(null);
                              }}>
                                <Edit3 size={16} />
                                Edit
                              </button>
                              <button className="danger" onClick={() => handleDeleteMilestone(milestone.id)}>
                                <Trash2 size={16} />
                                Delete
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {milestone.description && (
                        <p className="milestone-description">{milestone.description}</p>
                      )}
                      
                      <div className="milestone-meta">
                        {priority && (
                          <span className="priority-badge" style={{ color: priority.color }}>
                            <Flag size={14} />
                            {priority.label}
                          </span>
                        )}
                        
                        {milestone.dueDate && (
                          <span className={`due-date ${isOverdue ? 'overdue' : ''}`}>
                            <Calendar size={14} />
                            {isOverdue ? 'Overdue: ' : 'Due: '}
                            {format(parseISO(milestone.dueDate), 'MMM d, yyyy')}
                          </span>
                        )}
                        
                        {assignee && (
                          <span className="assignee">
                            <span className="assignee-avatar">{assignee.avatar}</span>
                            {assignee.name}
                          </span>
                        )}
                        
                        {milestone.status === 'completed' && milestone.completedAt && (
                          <span className="completed-date">
                            <CheckCircle2 size={14} />
                            Completed {format(parseISO(milestone.completedAt), 'MMM d')}
                          </span>
                        )}
                      </div>
                      
                      {/* Task Progress */}
                      {milestone.tasks && milestone.tasks.length > 0 && (
                        <div className="milestone-progress-section">
                          <div className="progress-header">
                            <span>Task Progress</span>
                            <span>{calculateMilestoneProgress(milestone)}%</span>
                          </div>
                          <div className="progress-bar">
                            <div 
                              className="progress-fill" 
                              style={{ width: `${calculateMilestoneProgress(milestone)}%` }}
                            />
                          </div>
                        </div>
                      )}
                      
                      {/* Tasks Section */}
                      <div className="milestone-tasks-section">
                        <div className="tasks-header">
                          <button
                            className="tasks-toggle"
                            onClick={() => toggleMilestoneExpanded(milestone.id)}
                          >
                            <Target size={14} />
                            <span>Tasks ({milestone.tasks?.length || 0})</span>
                            {expandedMilestones[milestone.id] ? (
                              <ChevronDown size={14} />
                            ) : (
                              <ChevronRight size={14} />
                            )}
                          </button>
                          <button
                            className="add-task-btn"
                            onClick={() => {
                              setTaskMilestoneId(milestone.id);
                              setShowTaskModal(true);
                            }}
                            title="Add Task"
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                        
                        {expandedMilestones[milestone.id] && (
                          <div className="tasks-list">
                            {milestone.tasks && milestone.tasks.length > 0 ? (
                              milestone.tasks.map(task => {
                                const taskAssignee = teamMembers.find(m => m.id === task.assigneeId);
                                const TaskStatusIcon = TASK_STATUSES.find(s => s.value === task.status)?.icon || Clock;
                                const taskIsOverdue = task.endDate && 
                                  task.status !== 'completed' && 
                                  isBefore(parseISO(task.endDate), new Date());
                                
                                return (
                                  <div 
                                    key={task.id} 
                                    className={`task-item ${task.status} ${taskIsOverdue ? 'overdue' : ''}`}
                                  >
                                    <div className="task-status-icon">
                                      <TaskStatusIcon 
                                        size={16} 
                                        style={{ color: TASK_STATUSES.find(s => s.value === task.status)?.color }}
                                      />
                                    </div>
                                    <div className="task-content">
                                      <div className="task-header">
                                        <span className="task-title">{task.title}</span>
                                        <div className="task-actions">
                                          <button
                                            className="task-edit-btn"
                                            onClick={() => {
                                              setEditingTask(task);
                                              setTaskMilestoneId(milestone.id);
                                              setShowTaskModal(true);
                                            }}
                                          >
                                            <Edit3 size={12} />
                                          </button>
                                          <button
                                            className="task-delete-btn"
                                            onClick={() => handleDeleteTask(milestone.id, task.id)}
                                          >
                                            <Trash2 size={12} />
                                          </button>
                                        </div>
                                      </div>
                                      <div className="task-meta">
                                        {task.startDate && task.endDate && (
                                          <span className="task-dates">
                                            <Calendar size={12} />
                                            {format(parseISO(task.startDate), 'MMM d')} - {format(parseISO(task.endDate), 'MMM d')}
                                          </span>
                                        )}
                                        {task.estimatedHours && (
                                          <span className="task-hours">
                                            {task.estimatedHours}h
                                          </span>
                                        )}
                                        {taskAssignee && (
                                          <span className="task-assignee">
                                            <span className="assignee-avatar">{taskAssignee.avatar}</span>
                                            {taskAssignee.name}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                    <select
                                      className="task-status-select"
                                      value={task.status}
                                      onChange={(e) => handleUpdateTask(milestone.id, task.id, { status: e.target.value })}
                                    >
                                      {TASK_STATUSES.map(s => (
                                        <option key={s.value} value={s.value}>{s.label}</option>
                                      ))}
                                    </select>
                                  </div>
                                );
                              })
                            ) : (
                              <div className="tasks-empty">No tasks yet. Add your first task!</div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="milestone-status-select">
                      <select
                        value={milestone.status}
                        onChange={(e) => handleStatusChange(milestone.id, e.target.value)}
                      >
                        {MILESTONE_STATUSES.map(s => (
                          <option key={s.value} value={s.value}>{s.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}
      
      {activeTab === 'updates' && (
        <section className="updates-section">
          <StatusUpdates 
            updates={project.statusUpdates || []}
            onAdd={handleAddStatusUpdate}
            onDelete={handleDeleteStatusUpdate}
          />
        </section>
      )}
      
      {(showMilestoneModal || editingMilestone) && (
        <MilestoneModal
          milestone={editingMilestone}
          teamMembers={teamMembers}
          onSave={editingMilestone 
            ? (data) => handleUpdateMilestone(editingMilestone.id, data)
            : handleAddMilestone
          }
          onClose={() => {
            setShowMilestoneModal(false);
            setEditingMilestone(null);
          }}
        />
      )}
      
      {(showTaskModal || editingTask) && taskMilestoneId && (
        <TaskModal
          task={editingTask}
          teamMembers={teamMembers}
          onSave={editingTask 
            ? (data) => handleUpdateTask(taskMilestoneId, editingTask.id, data)
            : (data) => handleAddTask(taskMilestoneId, data)
          }
          onClose={() => {
            setShowTaskModal(false);
            setEditingTask(null);
            setTaskMilestoneId(null);
          }}
        />
      )}
      
      {editingProject && (
        <ProjectModal
          project={project}
          teams={teams}
          onSave={handleUpdateProject}
          onClose={() => setEditingProject(false)}
        />
      )}
    </div>
  );
}

function MilestoneModal({ milestone, teamMembers, onSave, onClose }) {
  const [formData, setFormData] = useState({
    title: milestone?.title || '',
    description: milestone?.description || '',
    dueDate: milestone?.dueDate || '',
    priority: milestone?.priority || 'medium',
    assigneeId: milestone?.assigneeId || '',
    status: milestone?.status || 'pending',
  });
  
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.title.trim()) return;
    onSave(formData);
  };
  
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>{milestone ? 'Edit Milestone' : 'New Milestone'}</h2>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Title *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Milestone title"
              autoFocus
            />
          </div>
          
          <div className="form-group">
            <label>Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe this milestone..."
              rows={3}
            />
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label>Due Date</label>
              <input
                type="date"
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
              />
            </div>
            
            <div className="form-group">
              <label>Priority</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
              >
                {PRIORITIES.map(p => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="form-group">
            <label>Assignee</label>
            <select
              value={formData.assigneeId}
              onChange={(e) => setFormData({ ...formData, assigneeId: e.target.value })}
            >
              <option value="">Unassigned</option>
              {teamMembers.map(m => (
                <option key={m.id} value={m.id}>{m.avatar} {m.name}</option>
              ))}
            </select>
          </div>
          
          {milestone && (
            <div className="form-group">
              <label>Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              >
                {MILESTONE_STATUSES.map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
          )}
          
          <div className="modal-actions">
            <button type="button" className="secondary-btn" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="primary-btn">
              {milestone ? 'Update' : 'Create'} Milestone
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ProjectModal({ project, teams, onSave, onClose }) {
  const [formData, setFormData] = useState({
    name: project?.name || '',
    description: project?.description || '',
    deliverables: project?.deliverables || '',
    dueDate: project?.dueDate || '',
    priority: project?.priority || 'medium',
    size: project?.size || 'm',
    teamId: project?.teamId || '',
    color: project?.color || '#6366f1',
    portfolioIntake: project?.portfolioIntake || 'new',
  });
  
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;
    onSave(formData);
  };
  
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-large" onClick={(e) => e.stopPropagation()}>
        <h2>{project ? 'Edit Project' : 'New Project'}</h2>
        
        <form onSubmit={handleSubmit}>
          <div className="form-section">
            <h3 className="form-section-title">Basic Information</h3>
            
            <div className="form-group">
              <label>Project Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Project name"
                autoFocus
              />
            </div>
            
            <div className="form-group">
              <label>Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe your project..."
                rows={2}
              />
            </div>
            
            <div className="form-group">
              <label>Key Deliverables</label>
              <textarea
                value={formData.deliverables}
                onChange={(e) => setFormData({ ...formData, deliverables: e.target.value })}
                placeholder="List the main deliverables..."
                rows={2}
              />
            </div>
          </div>
          
          <div className="form-section">
            <h3 className="form-section-title">Project Details</h3>
            
            <div className="form-row three-col">
              <div className="form-group">
                <label>Priority</label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                >
                  {PROJECT_PRIORITIES.map(p => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </div>
              
              <div className="form-group">
                <label>Size</label>
                <select
                  value={formData.size}
                  onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                >
                  {SIZES.map(s => (
                    <option key={s.value} value={s.value}>{s.label} - {s.description}</option>
                  ))}
                </select>
              </div>
              
              <div className="form-group">
                <label>Due Date</label>
                <input
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                />
              </div>
            </div>
          </div>
          
          <div className="form-section">
            <h3 className="form-section-title">Team Assignment</h3>
            
            <div className="form-group">
              <label>Assign to Team</label>
              <div className="team-selector-cards">
                {teams.map(team => (
                  <button
                    key={team.id}
                    type="button"
                    className={`team-card ${formData.teamId === team.id ? 'selected' : ''}`}
                    style={{ 
                      '--team-color': team.color,
                      borderColor: formData.teamId === team.id ? team.color : 'var(--border-color)'
                    }}
                    onClick={() => setFormData({ ...formData, teamId: team.id })}
                  >
                    <span className="team-icon">{team.icon}</span>
                    <span className="team-name">{team.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
          
          <div className="form-section">
            <h3 className="form-section-title">Appearance</h3>
            
            <div className="form-group">
              <label>Project Color</label>
              <div className="color-picker">
                {PROJECT_COLORS.map(color => (
                  <button
                    key={color}
                    type="button"
                    className={`color-option ${formData.color === color ? 'selected' : ''}`}
                    style={{ backgroundColor: color }}
                    onClick={() => setFormData({ ...formData, color })}
                  />
                ))}
              </div>
            </div>
          </div>
          
          <div className="modal-actions">
            <button type="button" className="secondary-btn" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="primary-btn">
              {project ? 'Update' : 'Create'} Project
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function TaskModal({ task, teamMembers, onSave, onClose }) {
  const [formData, setFormData] = useState({
    title: task?.title || '',
    startDate: task?.startDate || '',
    endDate: task?.endDate || '',
    estimatedHours: task?.estimatedHours || '',
    assigneeId: task?.assigneeId || '',
    status: task?.status || 'pending',
  });
  
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.title.trim()) return;
    onSave(formData);
  };
  
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>{task ? 'Edit Task' : 'New Task'}</h2>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Task Title *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Task title"
              autoFocus
            />
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label>Start Date</label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              />
            </div>
            
            <div className="form-group">
              <label>End Date</label>
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
              />
            </div>
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label>Estimated Hours</label>
              <input
                type="number"
                min="0"
                step="0.5"
                value={formData.estimatedHours}
                onChange={(e) => setFormData({ ...formData, estimatedHours: e.target.value })}
                placeholder="e.g., 8"
              />
            </div>
            
            <div className="form-group">
              <label>Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              >
                {TASK_STATUSES.map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="form-group">
            <label>Assigned To</label>
            <select
              value={formData.assigneeId}
              onChange={(e) => setFormData({ ...formData, assigneeId: e.target.value })}
            >
              <option value="">Unassigned</option>
              {teamMembers.map(m => (
                <option key={m.id} value={m.id}>{m.avatar} {m.name}</option>
              ))}
            </select>
          </div>
          
          <div className="modal-actions">
            <button type="button" className="secondary-btn" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="primary-btn">
              {task ? 'Update' : 'Create'} Task
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
