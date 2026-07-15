import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { webhookRoute } from './routes/webhook';
import { groupsRoute } from './routes/groups';
import { emailsRoute } from './routes/emails';
import { codesRoute } from './routes/codes';
import { handleIncomingEmail } from './email-handler';
import { cleanupOldEmails } from './db';

const app = new Hono<{ Bindings: Env }>();

app.use('/api/*', cors());
app.use('/api/*', async (c, next) => {
  try {
    await next();
  } catch (err: any) {
    console.error('API Error:', err);
    return c.json({ error: err.message || 'Internal error' }, 500);
  }
});

app.route('/api', webhookRoute);
app.route('/api/groups', groupsRoute);
app.route('/api/emails', emailsRoute);
app.route('/api/codes', codesRoute);

app.get('/api/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }));

app.notFound((c) => c.json({ error: 'Not found' }, 404));

app.all('*', async (c) => {
  const url = new URL(c.req.url);
  if (url.pathname.startsWith('/api')) return c.json({ error: 'Not found' }, 404);
  const res = await c.env.ASSETS.fetch(c.req.raw);
  if (res.status !== 404) return res;
  url.pathname = '/index.html';
  return c.env.ASSETS.fetch(new Request(url));
});

export default {
  fetch: app.fetch,
  async email(message: ForwardableEmailMessage, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(handleIncomingEmail(message, env));
  },
  async scheduled(_event: ScheduledEvent, env: Env, _ctx: ExecutionContext) {
    const deleted = await cleanupOldEmails(env.DB);
    console.log(`[Cron] Cleaned up ${deleted} old email records`);
  },
};
