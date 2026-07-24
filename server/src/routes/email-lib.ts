import { Router, Request, Response } from 'express';
import {
  getAllCategories,
  getAllCategoriesWithEmails,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory,
  getEntries,
  setEntries,
  getNextEmail,
  resetState,
} from '../services/email-lib';

const router = Router();

router.get('/categories', (_req: Request, res: Response) => {
  const items = getAllCategoriesWithEmails();
  res.json(items);
});

router.get('/categories/:id', (req: Request, res: Response) => {
  const id = req.params.id as string;
  const item = getCategory(id);
  if (!item) { res.status(404).json({ error: 'Category not found' }); return; }
  res.json(item);
});

router.post('/categories', (req: Request, res: Response) => {
  const { name } = req.body;
  if (!name || !name.trim()) { res.status(400).json({ error: 'name is required' }); return; }
  const item = createCategory(name.trim());
  res.status(201).json(item);
});

router.put('/categories/:id', (req: Request, res: Response) => {
  const id = req.params.id as string;
  const { name } = req.body;
  if (!name || !name.trim()) { res.status(400).json({ error: 'name is required' }); return; }
  const item = updateCategory(id, name.trim());
  if (!item) { res.status(404).json({ error: 'Category not found' }); return; }
  res.json(item);
});

router.delete('/categories/:id', (req: Request, res: Response) => {
  const id = req.params.id as string;
  const ok = deleteCategory(id);
  if (!ok) { res.status(404).json({ error: 'Category not found' }); return; }
  res.json({ success: true });
});

router.get('/categories/:id/emails', (req: Request, res: Response) => {
  const id = req.params.id as string;
  const entries = getEntries(id);
  res.json(entries);
});

router.put('/categories/:id/emails', (req: Request, res: Response) => {
  const id = req.params.id as string;
  const { emails } = req.body;
  if (!Array.isArray(emails)) { res.status(400).json({ error: 'emails must be an array of strings' }); return; }
  const entries = setEntries(id, emails);
  res.json(entries);
});

router.get('/next/:categoryId', (req: Request, res: Response) => {
  const categoryId = req.params.categoryId as string;
  const result = getNextEmail(categoryId);
  if (!result) { res.status(404).json({ error: 'No emails in this category or category not found' }); return; }
  res.json(result);
});

router.post('/categories/:id/reset', (req: Request, res: Response) => {
  const id = req.params.id as string;
  const ok = resetState(id);
  if (!ok) { res.status(404).json({ error: 'Category not found' }); return; }
  res.json({ success: true });
});

export default router;
