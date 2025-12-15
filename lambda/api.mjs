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
    'Access-Control-Allow-Methods': 'OPTIONS,GET,POST,PATCH,DELETE',
    'Access-Control-Allow-Headers':
      'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token',
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
  if (!BUCKET) {
    return json(500, { error: 'Missing S3_BUCKET env var' });
  }

  // Normalize path from multiple possible locations (HTTP API / REST / test console)
  const pathFromRouteKey = event.routeKey ? event.routeKey.split(' ').slice(1).join(' ') : '';
  const rawPath =
    event.rawPath ||
    event.path ||
    event?.requestContext?.http?.path ||
    pathFromRouteKey ||
    '/';
  const method =
    event.httpMethod ||
    event?.requestContext?.http?.method ||
    event?.requestContext?.httpMethod ||
    '';

  // Short-circuit preflight
  if (method === 'OPTIONS') {
    return json(200, { ok: true });
  }
  let segments = rawPath.replace(/^\/+|\/+$/g, '').split('/').filter(Boolean);
  // Prefer explicit /api, but fall back to no-prefix paths
  const apiIndex = segments.indexOf('api');
  if (apiIndex >= 0) {
    segments = segments.slice(apiIndex + 1); // remove the 'api' segment itself
  }

  let body = {};
  if (event.body) {
    try {
      body = JSON.parse(event.body);
    } catch {
      return json(400, { error: 'Invalid JSON body' });
    }
  }

  try {
    // GET /api/state or /state (fallback: last segment == state)
    if (method === 'GET' && segments.length && segments[segments.length - 1] === 'state') {
      const db = await readDB();
      return json(200, db);
    }

    // Locate "projects" segment anywhere
    const projIdx = segments.indexOf('projects');
    if (projIdx !== -1) {
      const afterProjects = segments.slice(projIdx + 1);

      // POST /projects
      if (afterProjects.length === 0 && method === 'POST') {
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
      const projectId = afterProjects[0];
      const db = await readDB();
      const project = findProject(db, projectId);
      if (!project) {
        return json(404, { error: 'Project not found' });
      }

      // PATCH /api/projects/:id
      if (afterProjects.length === 1 && method === 'PATCH') {
        Object.assign(project, body);
        await writeDB(db);
        return json(200, project);
      }

      // DELETE /api/projects/:id
      if (afterProjects.length === 1 && method === 'DELETE') {
        db.projects = db.projects.filter(p => p.id !== projectId);
        await writeDB(db);
        return json(204, {});
      }

      // Milestones
      if (afterProjects[1] === 'milestones') {
        // POST /api/projects/:id/milestones
        if (afterProjects.length === 2 && method === 'POST') {
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

        const milestoneId = afterProjects[2];

        // PATCH /api/projects/:id/milestones/:mid
        if (afterProjects.length === 3 && method === 'PATCH') {
          project.milestones = project.milestones || [];
          const m = project.milestones.find(x => x.id === milestoneId);
          if (!m) return json(404, { error: 'Milestone not found' });
          Object.assign(m, body);
          await writeDB(db);
          return json(200, project);
        }

        // DELETE /api/projects/:id/milestones/:mid
        if (afterProjects.length === 3 && method === 'DELETE') {
          project.milestones = project.milestones || [];
          const before = project.milestones.length;
          project.milestones = project.milestones.filter(x => x.id !== milestoneId);
          if (project.milestones.length === before) return json(404, { error: 'Milestone not found' });
          await writeDB(db);
          return json(200, project);
        }

        // Tasks under milestone
        if (afterProjects[3] === 'tasks') {
          project.milestones = project.milestones || [];
          const milestone = project.milestones.find(x => x.id === milestoneId);
          if (!milestone) return json(404, { error: 'Milestone not found' });
          milestone.tasks = milestone.tasks || [];

          // POST /api/projects/:id/milestones/:mid/tasks
          if (afterProjects.length === 4 && method === 'POST') {
            const task = {
              id: randomUUID(),
              createdAt: new Date().toISOString(),
              status: 'pending',
              ...body,
            };
            milestone.tasks.push(task);
            await writeDB(db);
            return json(201, project);
          }

          const taskId = afterProjects[4];

          // PATCH /api/projects/:id/milestones/:mid/tasks/:tid
          if (afterProjects.length === 5 && method === 'PATCH') {
            const task = milestone.tasks.find(x => x.id === taskId);
            if (!task) return json(404, { error: 'Task not found' });
            Object.assign(task, body);
            await writeDB(db);
            return json(200, project);
          }

          // DELETE /api/projects/:id/milestones/:mid/tasks/:tid
          if (afterProjects.length === 5 && method === 'DELETE') {
            const before = milestone.tasks.length;
            milestone.tasks = milestone.tasks.filter(x => x.id !== taskId);
            if (milestone.tasks.length === before) return json(404, { error: 'Task not found' });
            await writeDB(db);
            return json(200, project);
          }
        }
      }

      // Status updates
      if (afterProjects[1] === 'status-updates') {
        // POST /api/projects/:id/status-updates
        if (afterProjects.length === 2 && method === 'POST') {
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

        const updateId = afterProjects[2];
        // DELETE /api/projects/:id/status-updates/:uid
        if (afterProjects.length === 3 && method === 'DELETE') {
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

