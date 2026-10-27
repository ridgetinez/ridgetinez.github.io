import path from 'node:path';
import { readdir } from 'node:fs/promises';

// An explicit snapshot of the previously public site, separate from Obsidian
// exports. Refuse symlinks so this cannot pull files from outside that snapshot.
export async function archiveFiles(directory) {
  if (!directory) return [];
  const files = [];
  async function walk(relative = '') {
    let entries;
    try { entries = await readdir(path.join(directory,relative),{withFileTypes:true}); }
    catch (error) { if (!relative && error.code === 'ENOENT') return; throw error; }
    for (const entry of entries) {
      if (entry.isSymbolicLink()) throw new Error('Archive must not contain symbolic links.');
      if (entry.name.startsWith('.')) throw new Error('Archive must not contain hidden files.');
      const name = path.join(relative,entry.name);
      if (entry.isDirectory()) await walk(name);
      else if (entry.isFile()) files.push(name);
      else throw new Error('Archive must contain ordinary files only.');
    }
  }
  await walk();
  return files;
}
