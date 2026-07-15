import { Router, Request, Response } from 'express';
import { getEmails, getEmail } from '../services/emails';

const router = Router();

router.get('/', (req: Request, res: Response) => {
  const {
    group, from, to, subject, sender_contains,
    limit, offset, start_date, end_date,
  } = req.query as Record<string, string | undefined>;

  const result = getEmails({
    group, from, to, subject, sender_contains,
    limit: limit ? parseInt(limit) : undefined,
    offset: offset ? parseInt(offset) : undefined,
    start_date, end_date,
  });

  res.json(result);
});

router.get('/:id', (req: Request, res: Response) => {
  const email = getEmail(String(req.params.id));
  if (!email) {
    res.status(404).json({ error: 'Email not found' });
    return;
  }
  res.json({
    ...email,
    extracted_data: JSON.parse(email.extracted_data || '{}'),
    response_cache: JSON.parse(email.response_cache || '{}'),
  });
});

export default router;
