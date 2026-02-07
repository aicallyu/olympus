import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { prettyJSON } from 'hono/pretty-json';
import { agentRoutes } from './routes/agents.js';
import { taskRoutes } from './routes/tasks.js';
import { messageRoutes } from './routes/messages.js';
import { activityRoutes } from './routes/activities.js';
import { notificationRoutes } from './routes/notifications.js';
import { documentRoutes } from './routes/documents.js';
import { metricsRoutes } from './routes/metrics.js';
import { projectRoutes } from './routes/projects.js';

const app = new Hono();

// Middleware
app.use('*', logger());
app.use('*', cors());
app.use('*', prettyJSON());

// Health check
app.get('/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }));

// API Routes
app.route('/api/agents', agentRoutes);
app.route('/api/tasks', taskRoutes);
app.route('/api/messages', messageRoutes);
app.route('/api/activities', activityRoutes);
app.route('/api/activity', activityRoutes); // Alias for /activity/stream
app.route('/api/notifications', notificationRoutes);
app.route('/api/documents', documentRoutes);
app.route('/api/metrics', metricsRoutes);
app.route('/api/projects', projectRoutes);

// 404 handler
app.notFound((c) => c.json({ error: 'Not Found' }, 404));

// Error handler
app.onError((err, c) => {
  console.error('Error:', err);
  return c.json({ error: 'Internal Server Error', message: err.message }, 500);
});

const port = process.env.PORT || 3001;

serve({
  fetch: app.fetch,
  port: Number(port),
}, (info) => {
  console.log(`🚀 Mission Control API running on http://localhost:${info.port}`);
});
