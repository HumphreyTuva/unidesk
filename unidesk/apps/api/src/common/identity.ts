// Emails and usernames are compared in lowercase, so "Jane", "JANE" and "jane" are the same person.
export const USERNAME_RE = /^[a-z0-9_.]{3,20}$/;

export const normalizeEmail = (v: string) => v.trim().toLowerCase();
export const normalizeUsername = (v: string) => v.trim().toLowerCase();
export const looksLikeEmail = (v: string) => v.includes('@');

export function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map(s => s.trim().toLowerCase())
    .filter(Boolean);
}
