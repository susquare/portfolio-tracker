import { useState } from 'react';
import { ProjectProvider } from './store/ProjectContext';
import { ThemeProvider } from './store/ThemeContext';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Portfolio from './components/Portfolio';
import Projects from './components/Projects';
import ProjectDetail from './components/ProjectDetail';
import NewProjectModal from './components/NewProjectModal';
import './App.css';

function AppContent() {
  const [currentView, setCurrentView] = useState('dashboard');
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  
  const handleNavigate = (view, projectId = null) => {
    setCurrentView(view);
    setSelectedProjectId(projectId);
  };
  
  const renderContent = () => {
    if (currentView === 'project' && selectedProjectId) {
      return (
        <ProjectDetail 
          projectId={selectedProjectId}
          onBack={() => handleNavigate('projects')}
        />
      );
    }
    
    switch (currentView) {
      case 'dashboard':
        return <Dashboard onNavigate={handleNavigate} />;
      case 'portfolio':
        return <Portfolio onNavigate={handleNavigate} />;
      case 'projects':
        return (
          <Projects 
            onNavigate={handleNavigate}
            showNewProjectModal={() => setShowNewProjectModal(true)}
          />
        );
      default:
        return <Dashboard onNavigate={handleNavigate} />;
    }
  };
  
  return (
    <div className="app">
      <Sidebar 
        currentView={currentView}
        selectedProjectId={selectedProjectId}
        onNavigate={handleNavigate}
        onNewProject={() => setShowNewProjectModal(true)}
      />
      <main className="main-content">
        {renderContent()}
      </main>
      
      {showNewProjectModal && (
        <NewProjectModal
          onClose={() => setShowNewProjectModal(false)}
          onSuccess={() => handleNavigate('projects')}
        />
      )}
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <ProjectProvider>
        <AppContent />
      </ProjectProvider>
    </ThemeProvider>
  );
}

export default App;
