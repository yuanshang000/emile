import express from 'express';
import cors from 'cors';
import path from 'path';
import { initDb } from './db';
import webhookRoutes from './routes/webhook';
import groupsRoutes from './routes/groups';
import emailsRoutes from './routes/emails';
import codesRoutes from './routes/codes';
import emailLibRoutes from './routes/email-lib';

const app = express();
const PORT = process.env.PORT || 3001;

initDb();

app.use(cors());
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));

app.use('/api', webhookRoutes);
app.use('/api/groups', groupsRoutes);
app.use('/api/emails', emailsRoutes);
app.use('/api/codes', codesRoutes);
app.use('/api/email-lib', emailLibRoutes);

const publicPath = path.resolve(__dirname, '../../client/dist');
app.use(express.static(publicPath));
app.get('*', (_req, res) => {
  res.sendFile(path.join(publicPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Manyme API server running on http://localhost:${PORT}`);
  console.log(`Web UI: http://localhost:${PORT}`);
  console.log(`API: http://localhost:${PORT}/api`);
});

export default app;
