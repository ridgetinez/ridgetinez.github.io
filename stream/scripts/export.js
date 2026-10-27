import path from 'node:path';
import { projectRoot } from '../src/config.js';
import { exportVault } from '../src/vault.js';

const vault = process.argv[2] || process.env.RIDGE_VAULT;
if (!vault) { console.error('Usage: npm run export -- "/path/to/Obsidian vault" (or set RIDGE_VAULT in .env)'); process.exitCode = 1; }
else {
  try {
    const posts = await exportVault(vault,path.join(projectRoot,'content'));
    console.log(`Prepared ${posts.length} public entries in content/. Review git diff before committing. No files were pushed.`);
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
