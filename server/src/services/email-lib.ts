import { getDb } from '../db';
import { uid } from '../uid';

export interface EmailLibCategory {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface EmailLibEntry {
  id: string;
  category_id: string;
  email: string;
  sort_order: number;
  created_at: string;
}

export interface EmailLibState {
  category_id: string;
  current_index: number;
}

export interface CategoryWithEmails extends EmailLibCategory {
  emails: EmailLibEntry[];
  current_index: number;
  total: number;
}

export function getAllCategories(): EmailLibCategory[] {
  return getDb().prepare('SELECT * FROM email_lib_categories ORDER BY created_at ASC').all() as EmailLibCategory[];
}

export function getAllCategoriesWithEmails(): CategoryWithEmails[] {
  const categories = getAllCategories();
  const result: CategoryWithEmails[] = [];
  for (const c of categories) {
    const state = getState(c.id);
    const entries = getEntries(c.id);
    result.push({
      ...c,
      emails: entries,
      current_index: state?.current_index ?? 0,
      total: entries.length,
    });
  }
  return result;
}

export function getCategory(id: string): EmailLibCategory | undefined {
  return getDb().prepare('SELECT * FROM email_lib_categories WHERE id = ?').get(id) as EmailLibCategory | undefined;
}

export function createCategory(name: string): EmailLibCategory {
  const id = uid();
  getDb().prepare('INSERT INTO email_lib_categories (id, name) VALUES (?, ?)').run(id, name);
  getDb().prepare('INSERT INTO email_lib_state (category_id, current_index) VALUES (?, 0)').run(id);
  return getCategory(id)!;
}

export function updateCategory(id: string, name: string): EmailLibCategory | undefined {
  const existing = getCategory(id);
  if (!existing) return undefined;
  getDb().prepare("UPDATE email_lib_categories SET name=?, updated_at=datetime('now') WHERE id=?").run(name, id);
  return getCategory(id);
}

export function deleteCategory(id: string): boolean {
  return getDb().prepare('DELETE FROM email_lib_categories WHERE id = ?').run(id).changes > 0;
}

export function getEntries(categoryId: string): EmailLibEntry[] {
  return getDb().prepare('SELECT * FROM email_lib_entries WHERE category_id = ? ORDER BY sort_order ASC, created_at ASC').all(categoryId) as EmailLibEntry[];
}

export function setEntries(categoryId: string, emails: string[]): EmailLibEntry[] {
  const existing = getCategory(categoryId);
  if (!existing) return [];

  getDb().prepare('DELETE FROM email_lib_entries WHERE category_id = ?').run(categoryId);
  getDb().prepare("UPDATE email_lib_state SET current_index = 0 WHERE category_id = ?").run(categoryId);

  const insert = getDb().prepare('INSERT INTO email_lib_entries (id, category_id, email, sort_order) VALUES (?, ?, ?, ?)');
  const tx = getDb().transaction((items: string[]) => {
    for (let i = 0; i < items.length; i++) {
      const e = items[i].trim();
      if (e) {
        insert.run(uid(), categoryId, e, i);
      }
    }
  });
  tx(emails);
  return getEntries(categoryId);
}

export function getState(categoryId: string): EmailLibState | undefined {
  return getDb().prepare('SELECT * FROM email_lib_state WHERE category_id = ?').get(categoryId) as EmailLibState | undefined;
}

export function getNextEmail(categoryId: string): { email: string; index: number; total: number } | null {
  const entries = getEntries(categoryId);
  if (entries.length === 0) return null;

  let state = getState(categoryId);
  let idx = state ? state.current_index : 0;
  if (idx >= entries.length) {
    idx = 0;
  }

  const entry = entries[idx];
  const nextIdx = (idx + 1) % entries.length;

  getDb().prepare('UPDATE email_lib_state SET current_index = ? WHERE category_id = ?').run(nextIdx, categoryId);

  return { email: entry.email, index: idx, total: entries.length };
}

export function resetState(categoryId: string): boolean {
  const existing = getCategory(categoryId);
  if (!existing) return false;
  getDb().prepare('UPDATE email_lib_state SET current_index = 0 WHERE category_id = ?').run(categoryId);
  return true;
}
