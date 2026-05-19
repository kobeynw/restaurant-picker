import express from 'express';
import { createSession, getSession } from '../socket/handlers.js';

export const sessionsRouter = express.Router();

sessionsRouter.post('/', (req, res) => {
  const session = createSession();
  res.json({ sessionId: session.id });
});

sessionsRouter.get('/:id', (req, res) => {
  const session = getSession(req.params.id);
  if (!session) return res.status(404).json({ error: 'Session not found' });
  res.json(session);
});
