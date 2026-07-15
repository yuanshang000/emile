import { Router, Request, Response } from 'express';
import {
  getAllGroups,
  getAllGroupsWithRules,
  getGroupWithRules,
  createGroup,
  updateGroup,
  deleteGroup,
  createMatchRule,
  updateMatchRule,
  deleteMatchRule,
  createExtractRule,
  updateExtractRule,
  deleteExtractRule,
  upsertResponseTemplate,
  deleteResponseTemplate,
} from '../services/groups';
import { reclassifyEmails } from '../services/classifier';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  const groups = getAllGroupsWithRules();
  res.json(groups);
});

router.get('/:id', (req: Request, res: Response) => {
  const group = getGroupWithRules(String(req.params.id));
  if (!group) {
    res.status(404).json({ error: 'Group not found' });
    return;
  }
  res.json(group);
});

router.post('/', (req: Request, res: Response) => {
  const { name, description, priority } = req.body;
  if (!name) {
    res.status(400).json({ error: 'name is required' });
    return;
  }
  const group = createGroup({ name, description, priority });
  res.status(201).json(group);
});

router.put('/:id', (req: Request, res: Response) => {
  const { name, description, priority, enabled } = req.body;
  const group = updateGroup(String(req.params.id), { name, description, priority, enabled });
  if (!group) {
    res.status(404).json({ error: 'Group not found' });
    return;
  }
  if (enabled !== undefined) reclassifyEmails();
  res.json(group);
});

router.delete('/:id', (req: Request, res: Response) => {
  const deleted = deleteGroup(String(req.params.id));
  if (!deleted) {
    res.status(404).json({ error: 'Group not found' });
    return;
  }
  res.json({ success: true });
});

router.post('/:groupId/match-rules', (req: Request, res: Response) => {
  const { field, operator, pattern } = req.body;
  if (!field || !operator || !pattern) {
    res.status(400).json({ error: 'field, operator, pattern are required' });
    return;
  }
  const rule = createMatchRule({ group_id: String(req.params.groupId), field, operator, pattern });
  reclassifyEmails();
  res.status(201).json(rule);
});

router.put('/match-rules/:id', (req: Request, res: Response) => {
  const rule = updateMatchRule(String(req.params.id), req.body);
  if (!rule) {
    res.status(404).json({ error: 'Match rule not found' });
    return;
  }
  reclassifyEmails();
  res.json(rule);
});

router.delete('/match-rules/:id', (req: Request, res: Response) => {
  const deleted = deleteMatchRule(String(req.params.id));
  if (!deleted) {
    res.status(404).json({ error: 'Match rule not found' });
    return;
  }
  reclassifyEmails();
  res.json({ success: true });
});

router.post('/:groupId/extract-rules', (req: Request, res: Response) => {
  const { field_name, source, pattern } = req.body;
  if (!field_name || !pattern) {
    res.status(400).json({ error: 'field_name and pattern are required' });
    return;
  }
  const rule = createExtractRule({ group_id: String(req.params.groupId), field_name, source: source || 'html', pattern });
  res.status(201).json(rule);
});

router.put('/extract-rules/:id', (req: Request, res: Response) => {
  const rule = updateExtractRule(String(req.params.id), req.body);
  if (!rule) {
    res.status(404).json({ error: 'Extract rule not found' });
    return;
  }
  res.json(rule);
});

router.delete('/extract-rules/:id', (req: Request, res: Response) => {
  const deleted = deleteExtractRule(String(req.params.id));
  if (!deleted) {
    res.status(404).json({ error: 'Extract rule not found' });
    return;
  }
  res.json({ success: true });
});

router.put('/:groupId/response-template', (req: Request, res: Response) => {
  const { template } = req.body;
  if (!template) {
    res.status(400).json({ error: 'template is required' });
    return;
  }
  const tpl = upsertResponseTemplate(String(req.params.groupId), template);
  res.json(tpl);
});

router.delete('/:groupId/response-template', (req: Request, res: Response) => {
  deleteResponseTemplate(String(req.params.groupId));
  res.json({ success: true });
});

export default router;
