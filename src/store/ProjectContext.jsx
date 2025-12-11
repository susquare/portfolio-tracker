import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';

const ProjectContext = createContext(null);
const ProjectDispatchContext = createContext(null);

const API_BASE =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? 'http://localhost:4000/api' : '');

if (!API_BASE) {
  // Fail fast in production if the API base is missing
  throw new Error('VITE_API_URL is not set. Please configure it in the environment.');
}

// Log once at module init (helpful to verify in browser console)
console.info('ProjectFlow API base:', API_BASE);

const initialState = {
  loading: true,
  error: null,
  projects: [],
  teams: [
    { id: 'team-a', name: 'Team A', color: '#6366f1', icon: '🅰️' },
    { id: 'team-b', name: 'Team B', color: '#22c55e', icon: '🅱️' },
    { id: 'team-c', name: 'Team C', color: '#f59e0b', icon: '©️' },
  ],
  teamMembers: [
    { id: '1', name: 'Alex Chen', avatar: '🧑‍💻', role: 'Developer', teamId: 'team-a' },
    { id: '2', name: 'Sarah Kim', avatar: '👩‍🎨', role: 'Designer', teamId: 'team-a' },
    { id: '3', name: 'Mike Johnson', avatar: '👨‍💼', role: 'Project Manager', teamId: 'team-b' },
    { id: '4', name: 'Emily Davis', avatar: '👩‍🔬', role: 'QA Engineer', teamId: 'team-b' },
    { id: '5', name: 'Chris Wilson', avatar: '🧑‍🔧', role: 'DevOps', teamId: 'team-c' },
  ],
};

async function apiJson(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  });
  if (!res.ok) {
    const msg = await res.text();
    throw new Error(msg || `API error ${res.status}`);
  }
  return res.json();
}

export function ProjectProvider({ children }) {
  const [state, setState] = useState(initialState);

  // Load from server
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setState(prev => ({ ...prev, loading: true, error: null }));
      try {
        const data = await apiJson('/state');
        if (!cancelled) {
          setState({
            ...state,
            ...data,
            loading: false,
            error: null,
          });
        }
      } catch (e) {
        if (!cancelled) {
          setState(prev => ({ ...prev, loading: false, error: 'Failed to load data' }));
          console.error(e);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dispatch = useCallback(async (action) => {
    switch (action.type) {
      case 'ADD_PROJECT': {
        const saved = await apiJson('/projects', {
          method: 'POST',
          body: JSON.stringify(action.project),
        });
        setState(prev => ({ ...prev, projects: [...prev.projects, saved] }));
        break;
      }
      case 'UPDATE_PROJECT': {
        const updated = await apiJson(`/projects/${action.id}`, {
          method: 'PATCH',
          body: JSON.stringify(action.updates),
        });
        setState(prev => ({
          ...prev,
          projects: prev.projects.map(p => (p.id === action.id ? updated : p)),
        }));
        break;
      }
      case 'DELETE_PROJECT': {
        await apiJson(`/projects/${action.id}`, { method: 'DELETE' });
        setState(prev => ({
          ...prev,
          projects: prev.projects.filter(p => p.id !== action.id),
        }));
        break;
      }
      case 'ADD_MILESTONE': {
        const updated = await apiJson(`/projects/${action.projectId}/milestones`, {
          method: 'POST',
          body: JSON.stringify(action.milestone),
        });
        setState(prev => ({
          ...prev,
          projects: prev.projects.map(p => (p.id === action.projectId ? updated : p)),
        }));
        break;
      }
      case 'UPDATE_MILESTONE': {
        const updated = await apiJson(`/projects/${action.projectId}/milestones/${action.milestoneId}`, {
          method: 'PATCH',
          body: JSON.stringify(action.updates),
        });
        setState(prev => ({
          ...prev,
          projects: prev.projects.map(p => (p.id === action.projectId ? updated : p)),
        }));
        break;
      }
      case 'DELETE_MILESTONE': {
        const updated = await apiJson(`/projects/${action.projectId}/milestones/${action.milestoneId}`, {
          method: 'DELETE',
        });
        setState(prev => ({
          ...prev,
          projects: prev.projects.map(p => (p.id === action.projectId ? updated : p)),
        }));
        break;
      }
      case 'ADD_STATUS_UPDATE': {
        const updated = await apiJson(`/projects/${action.projectId}/status-updates`, {
          method: 'POST',
          body: JSON.stringify(action.update),
        });
        setState(prev => ({
          ...prev,
          projects: prev.projects.map(p => (p.id === action.projectId ? updated : p)),
        }));
        break;
      }
      case 'DELETE_STATUS_UPDATE': {
        const updated = await apiJson(`/projects/${action.projectId}/status-updates/${action.updateId}`, {
          method: 'DELETE',
        });
        setState(prev => ({
          ...prev,
          projects: prev.projects.map(p => (p.id === action.projectId ? updated : p)),
        }));
        break;
      }
      default:
        console.warn('Unknown action', action);
    }
  }, []);

  const contextValue = useMemo(() => state, [state]);

  return (
    <ProjectContext.Provider value={contextValue}>
      <ProjectDispatchContext.Provider value={dispatch}>
        {children}
      </ProjectDispatchContext.Provider>
    </ProjectContext.Provider>
  );
}

export function useProjects() {
  return useContext(ProjectContext);
}

export function useProjectDispatch() {
  return useContext(ProjectDispatchContext);
}

