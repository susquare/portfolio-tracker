import express from 'express';
import cors from 'cors';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const PORT = process.env.PORT || 4000;

const initialData = {
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

async function ensureDataFile() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(DB_FILE);
  } catch {
    await fs.writeFile(DB_FILE, JSON.stringify(initialData, null, 2), 'utf-8');
  }
}

async function readDB() {
  await ensureDataFile();
  const data = await fs.readFile(DB_FILE, 'utf-8');
  return JSON.parse(data);
}

async function writeDB(data) {
  await fs.writeFile(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

const app = express();
app.use(cors());
app.use(express.json());

// Helpers
const findProject = (db, id) => db.projects.find(p => p.id === id);

// Routes
app.get('/api/state', async (_req, res) => {
  const db = await readDB();
  res.json(db);
});

app.post('/api/projects', async (req, res) => {
  const db = await readDB();
  const project = {
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    milestones: [],
    statusUpdates: [],
    status: 'active',
    ...req.body,
  };
  db.projects.push(project);
  await writeDB(db);
  res.status(201).json(project);
});

app.patch('/api/projects/:id', async (req, res) => {
  const db = await readDB();
  const project = findProject(db, req.params.id);
  if (!project) return res.status(404).send('Project not found');
  Object.assign(project, req.body);
  await writeDB(db);
  res.json(project);
});

app.delete('/api/projects/:id', async (req, res) => {
  const db = await readDB();
  const before = db.projects.length;
  db.projects = db.projects.filter(p => p.id !== req.params.id);
  if (db.projects.length === before) return res.status(404).send('Project not found');
  await writeDB(db);
  res.status(204).send();
});

// Milestones
app.post('/api/projects/:id/milestones', async (req, res) => {
  const db = await readDB();
  const project = findProject(db, req.params.id);
  if (!project) return res.status(404).send('Project not found');
  const milestone = {
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    status: 'pending',
    ...req.body,
  };
  project.milestones = project.milestones || [];
  project.milestones.push(milestone);
  await writeDB(db);
  res.status(201).json(project);
});

app.patch('/api/projects/:id/milestones/:mid', async (req, res) => {
  const db = await readDB();
  const project = findProject(db, req.params.id);
  if (!project) return res.status(404).send('Project not found');
  project.milestones = project.milestones || [];
  const milestone = project.milestones.find(m => m.id === req.params.mid);
  if (!milestone) return res.status(404).send('Milestone not found');
  Object.assign(milestone, req.body);
  await writeDB(db);
  res.json(project);
});

app.delete('/api/projects/:id/milestones/:mid', async (req, res) => {
  const db = await readDB();
  const project = findProject(db, req.params.id);
  if (!project) return res.status(404).send('Project not found');
  const before = project.milestones?.length || 0;
  project.milestones = (project.milestones || []).filter(m => m.id !== req.params.mid);
  if (project.milestones.length === before) return res.status(404).send('Milestone not found');
  await writeDB(db);
  res.json(project);
});

// Status updates
app.post('/api/projects/:id/status-updates', async (req, res) => {
  const db = await readDB();
  const project = findProject(db, req.params.id);
  if (!project) return res.status(404).send('Project not found');
  const update = {
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    ...req.body,
  };
  project.statusUpdates = project.statusUpdates || [];
  project.statusUpdates.unshift(update);
  await writeDB(db);
  res.status(201).json(project);
});

app.delete('/api/projects/:id/status-updates/:uid', async (req, res) => {
  const db = await readDB();
  const project = findProject(db, req.params.id);
  if (!project) return res.status(404).send('Project not found');
  const before = project.statusUpdates?.length || 0;
  project.statusUpdates = (project.statusUpdates || []).filter(u => u.id !== req.params.uid);
  if (project.statusUpdates.length === before) return res.status(404).send('Status update not found');
  await writeDB(db);
  res.json(project);
});

app.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`);
});

