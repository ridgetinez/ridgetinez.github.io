export function siteConfiguration(siteURL = 'http://127.0.0.1:4173/', timezone = 'Australia/Sydney') {
  const url = new URL(siteURL);
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) throw new Error('SITE_URL must be an HTTP(S) site URL without credentials, query or fragment.');
  const basePath = url.pathname.replace(/\/$/, '');
  if (basePath && !/^\/[a-zA-Z0-9_/-]+$/.test(basePath)) throw new Error('Use a simple path in SITE_URL.');
  new Intl.DateTimeFormat('en', { timeZone: timezone });
  return { static:true, publicOrigin:url.origin + basePath, basePath, timezone };
}

export function sitePath(value, config = {}) {
  if (!value.startsWith('/') || value.startsWith('//')) return value;
  let result = value;
  if (config.static) result = result.replace(/^\/p\/([a-zA-Z0-9-]+)(?=$|#)/, '/p/$1/');
  return (config.basePath || '') + result;
}

export const postPath = (id, config = {}) => sitePath(`/p/${id}${config.static ? '/' : ''}`, config);
export const tagPath = (tag, config = {}) => config.static ? sitePath(`/tag/${encodeURIComponent(tag)}/`, config) : `/?tag=${encodeURIComponent(tag)}`;
