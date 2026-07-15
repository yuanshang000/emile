import { Hono } from 'hono';
import {
  getAllGroupsWithRules,
  getGroup,
  getGroup as getGroupById,
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
} from '../db';

export const groupsRoute = new Hono<{ Bindings: Env }>();

groupsRoute.get('/', async (c) => {
  const groups = await getAllGroupsWithRules(c.env.DB);
  return c.json(groups);
});

groupsRoute.get('/:id', async (c) => {
  const group = await getGroupById(c.env.DB, c.req.param('id'));
  if (!group) return c.json({ error: 'Group not found' }, 404);
  const rules = await getAllGroupsWithRules(c.env.DB);
  const found = rules.find((g: any) => g.id === c.req.param('id'));
  return c.json(found || group);
});

groupsRoute.post('/', async (c) => {
  const { name, description, priority } = await c.req.json();
  if (!name) return c.json({ error: 'name is required' }, 400);
  const group = await createGroup(c.env.DB, { name, description, priority });
  return c.json(group, 201);
});

groupsRoute.put('/:id', async (c) => {
  const data = await c.req.json();
  const group = await updateGroup(c.env.DB, c.req.param('id'), data);
  if (!group) return c.json({ error: 'Group not found' }, 404);
  return c.json(group);
});

groupsRoute.delete('/:id', async (c) => {
  const deleted = await deleteGroup(c.env.DB, c.req.param('id'));
  if (!deleted) return c.json({ error: 'Group not found' }, 404);
  return c.json({ success: true });
});

groupsRoute.post('/:groupId/match-rules', async (c) => {
  const { field, operator, pattern } = await c.req.json();
  if (!field || !operator || !pattern) {
    return c.json({ error: 'field, operator, pattern are required' }, 400);
  }
  const rule = await createMatchRule(c.env.DB, {
    group_id: c.req.param('groupId'), field, operator, pattern,
  });
  return c.json(rule, 201);
});

groupsRoute.put('/match-rules/:id', async (c) => {
  const data = await c.req.json();
  const rule = await updateMatchRule(c.env.DB, c.req.param('id'), data);
  if (!rule) return c.json({ error: 'Match rule not found' }, 404);
  return c.json(rule);
});

groupsRoute.delete('/match-rules/:id', async (c) => {
  const deleted = await deleteMatchRule(c.env.DB, c.req.param('id'));
  if (!deleted) return c.json({ error: 'Match rule not found' }, 404);
  return c.json({ success: true });
});

groupsRoute.post('/:groupId/extract-rules', async (c) => {
  const { field_name, source, pattern } = await c.req.json();
  if (!field_name || !pattern) {
    return c.json({ error: 'field_name and pattern are required' }, 400);
  }
  const rule = await createExtractRule(c.env.DB, {
    group_id: c.req.param('groupId'), field_name, source: source || 'html', pattern,
  });
  return c.json(rule, 201);
});

groupsRoute.put('/extract-rules/:id', async (c) => {
  const data = await c.req.json();
  const rule = await updateExtractRule(c.env.DB, c.req.param('id'), data);
  if (!rule) return c.json({ error: 'Extract rule not found' }, 404);
  return c.json(rule);
});

groupsRoute.delete('/extract-rules/:id', async (c) => {
  const deleted = await deleteExtractRule(c.env.DB, c.req.param('id'));
  if (!deleted) return c.json({ error: 'Extract rule not found' }, 404);
  return c.json({ success: true });
});

groupsRoute.put('/:groupId/response-template', async (c) => {
  const { template } = await c.req.json();
  if (!template) return c.json({ error: 'template is required' }, 400);
  const tpl = await upsertResponseTemplate(c.env.DB, c.req.param('groupId'), template);
  return c.json(tpl);
});

groupsRoute.delete('/:groupId/response-template', async (c) => {
  await deleteResponseTemplate(c.env.DB, c.req.param('groupId'));
  return c.json({ success: true });
});
