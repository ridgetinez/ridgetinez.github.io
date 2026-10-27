import { buildSite } from '../src/static.js';
import { projectRoot } from '../src/config.js';
import path from 'node:path';

try {
  const result = await buildSite({siteURL:process.env.SITE_URL,timezone:process.env.BLOG_TIMEZONE,archiveDir:path.join(projectRoot,'legacy-public')});
  console.log(`Built ${result.posts} entries in dist/ for ${result.config.publicOrigin}/`);
} catch (error) { console.error(error.message); process.exitCode = 1; }
