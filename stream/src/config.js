import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const projectRoot = fileURLToPath(new URL('../', import.meta.url));

export function configuration(overrides = {}) {
  const env = process.env;
  const value = {
    dataDir: path.resolve(env.RIDGE_DATA_DIR || path.join(projectRoot, 'data')),
    publicPort: Number(env.PUBLIC_PORT || 3333),
    publicHost: env.PUBLIC_HOST || '127.0.0.1',
    editorPort: Number(env.EDITOR_PORT || 3334),
    publicOrigin: env.PUBLIC_ORIGIN || 'http://127.0.0.1:3333',
    editorOrigin: env.EDITOR_ORIGIN || '',
    editorAccess: env.EDITOR_ACCESS || 'local',
    tailscaleOwner: env.TAILSCALE_OWNER || '',
    timezone: env.BLOG_TIMEZONE || 'Australia/Sydney',
    demo: false,
    ...overrides
  };
  if (!['local', 'tailscale'].includes(value.editorAccess)) throw new Error('EDITOR_ACCESS must be local or tailscale.');
  for (const port of [value.publicPort, value.editorPort]) {
    if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error('Invalid listener port.');
  }
  const publicURL = new URL(value.publicOrigin);
  if (!['http:', 'https:'].includes(publicURL.protocol)) throw new Error('PUBLIC_ORIGIN must be an HTTP(S) origin.');
  value.publicOrigin = publicURL.origin;
  new Intl.DateTimeFormat('en', { timeZone: value.timezone });
  if (value.editorAccess === 'tailscale') {
    if (!value.tailscaleOwner || !value.editorOrigin) throw new Error('Tailscale mode needs TAILSCALE_OWNER and EDITOR_ORIGIN.');
    const origin = new URL(value.editorOrigin);
    if (origin.protocol !== 'https:' || !origin.hostname.endsWith('.ts.net') || origin.pathname !== '/') {
      throw new Error('EDITOR_ORIGIN must be your HTTPS Tailscale Serve origin.');
    }
    value.editorOrigin = origin.origin;
  }
  return value;
}

export class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
