import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';

const BUCKET = process.env.S3_BUCKET || process.env.BUCKET;
const KEY = process.env.S3_KEY || 'db.json';
const REGION = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'us-east-1';

const s3 = new S3Client({ region: REGION });

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

const json = (statusCode, body) => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  },
  body: JSON.stringify(body),
});

async function readDB() {
  try {
    const res = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: KEY }));
    const text = await res.Body.transformToString('utf-8');
    return JSON.parse(text);
  } catch (err) {
    // If missing, fall back to initial
    if (err.$metadata?.httpStatusCode === 404) {
      return structuredClone(initialData);
    }
    console.error('readDB error', err);
    throw err;
  }
}

async function writeDB(data) {
  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: KEY,
      Body: JSON.stringify(data, null, 2),
      ContentType: 'application/json',
    })
  );
}

const findProject = (db, id) => db.projects.find(p => p.id === id);

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return json(200, { ok: true });
  }

  if (!BUCKET) {
    return json(500, { error: 'Missing S3_BUCKET env var' });
  }

  const path = event.path || '';
  const method = event.httpMethod;
  const segments = path.replace(/^\/+|\/+$/g, '').split('/');

  let body = {};
  if (event.body) {
    try {
      body = JSON.parse(event.body);
    } catch {
      return json(400, { error: 'Invalid JSON body' });
    }
  }

  try {
    // Routes start with /api
    if (segments[0] !== 'api') {
      return json(404, { error: 'Not found' });
    }

    // GET /api/state
    if (segments.length === 2 && segments[1] === 'state' && method === 'GET') {
      const db = await readDB();
      return json(200, db);
    }

    // /api/projects
    if (segments[1] === 'projects') {
      // POST /api/projects
      if (segments.length === 2 && method === 'POST') {
        const db = await readDB();
        const project = {
          id: randomUUID(),
          createdAt: new Date().toISOString(),
          milestones: [],
          statusUpdates: [],
          status: 'active',
          ...body,
        };
        db.projects.push(project);
        await writeDB(db);
        return json(201, project);
      }

      // With project id
      const projectId = segments[2];
      const db = await readDB();
      const project = findProject(db, projectId);
      if (!project) {
        return json(404, { error: 'Project not found' });
      }

      // PATCH /api/projects/:id
      if (segments.length === 3 && method === 'PATCH') {
        Object.assign(project, body);
        await writeDB(db);
        return json(200, project);
      }

      // DELETE /api/projects/:id
      if (segments.length === 3 && method === 'DELETE') {
        db.projects = db.projects.filter(p => p.id !== projectId);
        await writeDB(db);
        return json(204, {});
      }

      // Milestones
      if (segments[3] === 'milestones') {
        // POST /api/projects/:id/milestones
        if (segments.length === 4 && method === 'POST') {
          const milestone = {
            id: randomUUID(),
            createdAt: new Date().toISOString(),
            status: 'pending',
            ...body,
          };
          project.milestones = project.milestones || [];
          project.milestones.push(milestone);
          await writeDB(db);
          return json(201, project);
        }

        const milestoneId = segments[4];

        // PATCH /api/projects/:id/milestones/:mid
        if (segments.length === 5 && method === 'PATCH') {
          project.milestones = project.milestones || [];
          const m = project.milestones.find(x => x.id === milestoneId);
          if (!m) return json(404, { error: 'Milestone not found' });
          Object.assign(m, body);
          await writeDB(db);
          return json(200, project);
        }

        // DELETE /api/projects/:id/milestones/:mid
        if (segments.length === 5 && method === 'DELETE') {
          project.milestones = project.milestones || [];
          const before = project.milestones.length;
          project.milestones = project.milestones.filter(x => x.id !== milestoneId);
          if (project.milestones.length === before) return json(404, { error: 'Milestone not found' });
          await writeDB(db);
          return json(200, project);
        }
      }

      // Status updates
      if (segments[3] === 'status-updates') {
        // POST /api/projects/:id/status-updates
        if (segments.length === 4 && method === 'POST') {
          const update = {
            id: randomUUID(),
            createdAt: new Date().toISOString(),
            ...body,
          };
          project.statusUpdates = project.statusUpdates || [];
          project.statusUpdates.unshift(update);
          await writeDB(db);
          return json(201, project);
        }

        const updateId = segments[4];
        // DELETE /api/projects/:id/status-updates/:uid
        if (segments.length === 5 && method === 'DELETE') {
          project.statusUpdates = project.statusUpdates || [];
          const before = project.statusUpdates.length;
          project.statusUpdates = project.statusUpdates.filter(u => u.id !== updateId);
          if (project.statusUpdates.length === before) return json(404, { error: 'Status update not found' });
          await writeDB(db);
          return json(200, project);
        }
      }
    }

    return json(404, { error: 'Not found' });
  } catch (err) {
    console.error('Handler error', err);
    return json(500, { error: 'Internal error' });
  }
};

