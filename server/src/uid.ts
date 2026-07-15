import crypto from 'crypto';

export function uid(): string {
  return crypto.randomUUID();
}
