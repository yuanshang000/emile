import { Router, Request, Response } from 'express';
import { getGroup } from '../services/groups';
import { getLatestEmailByGroup, getLatestCodeByGroup } from '../services/emails';

const router = Router();

router.get('/latest', (req: Request, res: Response) => {
  const { group: groupId } = req.query as Record<string, string | undefined>;

  if (groupId) {
    const group = getGroup(groupId);
    if (!group) {
      res.status(404).json({ error: 'Group not found' });
      return;
    }

    const email = getLatestEmailByGroup(groupId);
    if (!email) {
      res.status(404).json({ error: 'No emails found for this group' });
      return;
    }

    const cache = JSON.parse(email.response_cache || '{}');
    res.json({
      email_id: email.id,
      from: email.from_addr,
      subject: email.subject,
      received_at: email.received_at,
      ...cache,
    });
    return;
  }

  res.status(400).json({ error: 'group query parameter is required' });
});

router.get('/latest/code', (req: Request, res: Response) => {
  const { group: groupId } = req.query as Record<string, string | undefined>;

  if (!groupId) {
    res.status(400).json({ error: 'group query parameter is required' });
    return;
  }

  const group = getGroup(groupId);
  if (!group) {
    res.status(404).json({ error: 'Group not found' });
    return;
  }

  const result = getLatestCodeByGroup(groupId);
  if (!result) {
    res.status(404).json({ error: 'No emails found for this group' });
    return;
  }

  res.json({
    email_id: result.email.id,
    from: result.email.from_addr,
    subject: result.email.subject,
    code: result.code,
    received_at: result.email.received_at,
  });
});

export default router;
