import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { 
  Plus, 
  Trash2, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  AlertTriangle,
  CheckCircle2,
  Clock,
  MessageSquare
} from 'lucide-react';

const HEALTH_OPTIONS = [
  { value: 'on-track', label: 'On Track', icon: CheckCircle2, color: '#22c55e' },
  { value: 'at-risk', label: 'At Risk', icon: AlertTriangle, color: '#f59e0b' },
  { value: 'off-track', label: 'Off Track', icon: TrendingDown, color: '#ef4444' },
  { value: 'completed', label: 'Completed', icon: CheckCircle2, color: '#818cf8' },
];

export default function StatusUpdates({ updates = [], onAdd, onDelete }) {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    health: 'on-track',
    summary: '',
    accomplishments: '',
    blockers: '',
    nextSteps: '',
    weekOf: new Date().toISOString().split('T')[0],
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.summary.trim()) return;
    
    onAdd(formData);
    setFormData({
      health: 'on-track',
      summary: '',
      accomplishments: '',
      blockers: '',
      nextSteps: '',
      weekOf: new Date().toISOString().split('T')[0],
    });
    setShowForm(false);
  };

  const getHealthConfig = (health) => {
    return HEALTH_OPTIONS.find(h => h.value === health) || HEALTH_OPTIONS[0];
  };

  return (
    <div className="status-updates-section">
      <div className="section-header">
        <h3>
          <Clock size={18} />
          Weekly Status Updates
        </h3>
        <button className="primary-btn small" onClick={() => setShowForm(!showForm)}>
          <Plus size={16} />
          Add Update
        </button>
      </div>

      {showForm && (
        <form className="status-form" onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label>Week Of</label>
              <input
                type="date"
                value={formData.weekOf}
                onChange={(e) => setFormData({ ...formData, weekOf: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Project Health</label>
              <div className="health-selector">
                {HEALTH_OPTIONS.map(option => (
                  <button
                    key={option.value}
                    type="button"
                    className={`health-option ${formData.health === option.value ? 'selected' : ''}`}
                    style={{ 
                      '--health-color': option.color,
                      borderColor: formData.health === option.value ? option.color : 'var(--border-color)'
                    }}
                    onClick={() => setFormData({ ...formData, health: option.value })}
                  >
                    <option.icon size={16} />
                    <span>{option.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="form-group">
            <label>Status Summary *</label>
            <textarea
              value={formData.summary}
              onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
              placeholder="Brief summary of project status this week..."
              rows={2}
            />
          </div>

          <div className="form-group">
            <label>Key Accomplishments</label>
            <textarea
              value={formData.accomplishments}
              onChange={(e) => setFormData({ ...formData, accomplishments: e.target.value })}
              placeholder="What was completed this week?"
              rows={2}
            />
          </div>

          <div className="form-group">
            <label>Blockers / Risks</label>
            <textarea
              value={formData.blockers}
              onChange={(e) => setFormData({ ...formData, blockers: e.target.value })}
              placeholder="Any blockers or risks?"
              rows={2}
            />
          </div>

          <div className="form-group">
            <label>Next Steps</label>
            <textarea
              value={formData.nextSteps}
              onChange={(e) => setFormData({ ...formData, nextSteps: e.target.value })}
              placeholder="Plans for next week..."
              rows={2}
            />
          </div>

          <div className="form-actions">
            <button type="button" className="secondary-btn" onClick={() => setShowForm(false)}>
              Cancel
            </button>
            <button type="submit" className="primary-btn">
              Save Update
            </button>
          </div>
        </form>
      )}

      {updates.length === 0 ? (
        <div className="empty-state small">
          <MessageSquare size={32} />
          <p>No status updates yet. Add your first weekly update!</p>
        </div>
      ) : (
        <div className="updates-timeline">
          {updates.map((update, index) => {
            const healthConfig = getHealthConfig(update.health);
            const HealthIcon = healthConfig.icon;
            
            return (
              <div key={update.id} className="update-card">
                <div className="update-timeline-marker">
                  <div 
                    className="marker-dot"
                    style={{ backgroundColor: healthConfig.color }}
                  />
                  {index < updates.length - 1 && <div className="marker-line" />}
                </div>
                
                <div className="update-content">
                  <div className="update-header">
                    <div className="update-meta">
                      <span className="update-week">
                        Week of {format(parseISO(update.weekOf), 'MMMM d, yyyy')}
                      </span>
                      <span 
                        className="health-badge"
                        style={{ 
                          backgroundColor: `${healthConfig.color}20`,
                          color: healthConfig.color 
                        }}
                      >
                        <HealthIcon size={14} />
                        {healthConfig.label}
                      </span>
                    </div>
                    <button 
                      className="delete-btn"
                      onClick={() => onDelete(update.id)}
                      title="Delete update"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  
                  <p className="update-summary">{update.summary}</p>
                  
                  {update.accomplishments && (
                    <div className="update-section">
                      <h5>
                        <CheckCircle2 size={14} />
                        Accomplishments
                      </h5>
                      <p>{update.accomplishments}</p>
                    </div>
                  )}
                  
                  {update.blockers && (
                    <div className="update-section blockers">
                      <h5>
                        <AlertTriangle size={14} />
                        Blockers / Risks
                      </h5>
                      <p>{update.blockers}</p>
                    </div>
                  )}
                  
                  {update.nextSteps && (
                    <div className="update-section">
                      <h5>
                        <TrendingUp size={14} />
                        Next Steps
                      </h5>
                      <p>{update.nextSteps}</p>
                    </div>
                  )}
                  
                  <span className="update-timestamp">
                    Posted {format(parseISO(update.createdAt), 'MMM d, yyyy h:mm a')}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

