import path from 'node:path';
import { projectRoot } from '../src/config.js';
import { exportVault } from '../src/vault.js';
import { buildSite } from '../src/static.js';

const vault = process.argv[2] || process.env.RIDGE_VAULT;
if (!vault) { console.error('Pass your vault path, or set RIDGE_VAULT in .env.'); process.exitCode = 1; }
else try {
  await exportVault(vault,path.join(projectRoot,'content'));
  const result = await buildSite({siteURL:process.env.SITE_URL,timezone:process.env.BLOG_TIMEZONE});
  console.log(`${result.posts} entries ready. Review content/ with git diff, including new media.\nNothing committed or pushed. Start npm run preview to inspect this snapshot.`);
} catch (error) { console.error(error.message); process.exitCode = 1; }
