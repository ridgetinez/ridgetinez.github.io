import path from 'node:path';
import { watch } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { projectRoot } from '../src/config.js';
import { exportVault } from '../src/vault.js';
import { buildSite } from '../src/static.js';
import { previewSite } from './preview.js';

export async function writingPreview(vault, {port = Number(process.env.PREVIEW_PORT || 4173), workspace = 'writing-preview', onBuild = async () => {}} = {}) {
  vault = path.resolve(vault);
  const contentDir = path.join(projectRoot,'.local',workspace,'content');
  const outputDir = path.join(projectRoot,'.local',workspace,'site');
  async function rebuild() {
    const posts = await exportVault(vault,contentDir);
    await buildSite({contentDir,outputDir,siteURL:`http://127.0.0.1:${port}/`,timezone:process.env.BLOG_TIMEZONE});
    await onBuild({outputDir});
    console.log(`${posts.length} public entries previewed locally. Refresh the browser to see changes.`);
  }
  await rebuild();
  const app = await previewSite({directory:outputDir,port});
  console.log(`Obsidian vault: ${vault}\nLocal preview: ${app.url}\nWatching saves. This never updates content/, commits or pushes.`);
  let timer, pending = false, running = false, closing = false;
  async function update() {
    pending = true;
    if (running) return;
    running = true;
    while (pending && !closing) {
      pending = false;
      try { await rebuild(); }
      catch (error) { console.error(`Preview kept at its last successful version: ${error.message}`); }
    }
    running = false;
  }
  const watcher = watch(vault,{recursive:true},(_,filename) => {
    if (closing || !filename || filename.split(path.sep).some(part => part.startsWith('.') || part === 'Templates')) return;
    clearTimeout(timer); timer = setTimeout(update,500);
  });
  watcher.on('error',error => console.error(`Vault watcher: ${error.message}. Restart the preview if saves stop appearing.`));
  for (const signal of ['SIGINT','SIGTERM']) process.once(signal,async()=>{closing=true;clearTimeout(timer);watcher.close();await app.close();process.exit(0);});
  return app;
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  const vault = process.argv[2] || process.env.RIDGE_VAULT;
  if (!vault) { console.error('Usage: npm run dev -- "/path/to/Obsidian vault" (or set RIDGE_VAULT in .env)'); process.exitCode = 1; }
  else try { await writingPreview(vault); } catch (error) { console.error(error.message); process.exitCode = 1; }
}
