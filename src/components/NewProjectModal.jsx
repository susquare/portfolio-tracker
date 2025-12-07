import { useState } from 'react';
import { useProjects, useProjectDispatch } from '../store/ProjectContext';
import { X, ChevronDown, ChevronUp, Users } from 'lucide-react';

const PROJECT_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', 
  '#f97316', '#eab308', '#22c55e', '#14b8a6', 
  '#06b6d4', '#3b82f6'
];

const PRIORITIES = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
];

const SIZES = [
  { value: 'xs', label: 'XS - Extra Small', description: '1-2 weeks' },
  { value: 's', label: 'S - Small', description: '2-4 weeks' },
  { value: 'm', label: 'M - Medium', description: '1-2 months' },
  { value: 'l', label: 'L - Large', description: '2-4 months' },
  { value: 'xl', label: 'XL - Extra Large', description: '4+ months' },
];

export default function NewProjectModal({ onClose, onSuccess }) {
  const { teams } = useProjects();
  const dispatch = useProjectDispatch();
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    deliverables: '',
    dueDate: '',
    priority: 'medium',
    size: 'm',
    teamId: '',
    color: PROJECT_COLORS[Math.floor(Math.random() * PROJECT_COLORS.length)],
    status: 'active',
  });
  
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;
    
    dispatch({ type: 'ADD_PROJECT', project: formData });
    onSuccess?.();
    onClose();
  };
  
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-large" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Create New Project</h2>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="form-section">
            <h3 className="form-section-title">Basic Information</h3>
            
            <div className="form-group">
              <label>Project Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter project name"
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
                placeholder="List the main deliverables (e.g., UI Design, API Integration, Documentation)"
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
                  {PRIORITIES.map(p => (
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
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
              
              <div className="form-group">
                <label>Target Date</label>
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
          
          <button 
            type="button" 
            className="advanced-toggle"
            onClick={() => setShowAdvanced(!showAdvanced)}
          >
            {showAdvanced ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            Advanced Options
          </button>
          
          {showAdvanced && (
            <div className="form-section">
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
          )}
          
          <div className="modal-actions">
            <button type="button" className="secondary-btn" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="primary-btn">
              Create Project
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
