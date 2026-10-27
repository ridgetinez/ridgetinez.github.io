import path from 'node:path';
import { mkdir, cp, writeFile } from 'node:fs/promises';
import { projectRoot } from '../src/config.js';

const directory = path.join(projectRoot,'.local/vault');
try {
  await mkdir(path.dirname(directory),{recursive:true});
  await mkdir(directory); // Deliberately refuse to overwrite an existing vault.
  await cp(path.join(projectRoot,'obsidian'),directory,{recursive:true});
  await mkdir(path.join(directory,'Attachments'));
  await mkdir(path.join(directory,'Stream'));
  await writeFile(path.join(directory,'Start here.md'),'# ridge\n\nThis is your local writing vault. Nothing in it is published unless a note has `publish: true` and you export, commit and push.\n\nSee the project’s docs/obsidian.md for the one-time Obsidian setup.\n');
  console.log(`Created ${directory}\nIn Obsidian, choose Open folder as vault. See docs/obsidian.md for template setup.`);
} catch (error) { console.error(error.code === 'EEXIST' ? `Vault already exists: ${directory}. No files were changed.` : error.message); process.exitCode = 1; }
