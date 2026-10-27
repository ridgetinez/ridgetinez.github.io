import path from 'node:path';
import { mkdir, cp, copyFile, access } from 'node:fs/promises';
import { projectRoot } from '../src/config.js';
import { writingPreview } from './write.js';
import { createGardenStudy } from './create-garden-study.js';

const directory = path.join(projectRoot,'.local/obsidian-demo');
try {
  try { await access(directory); }
  catch {
    await cp(path.join(projectRoot,'examples/obsidian'),directory,{recursive:true});
    await mkdir(path.join(directory,'Attachments'),{recursive:true});
    for (const file of ['coffee.jpg','reflection.m4a']) await copyFile(path.join(projectRoot,'examples',file),path.join(directory,'Attachments',file));
  }
  console.log('Sample Obsidian notes only. Separate from your writing vault and the published snapshot.');
  await writingPreview(directory,{port:Number(process.env.PREVIEW_PORT || 4174),workspace:'obsidian-demo-preview',onBuild:createGardenStudy});
  console.log(`Endless garden study: http://127.0.0.1:${Number(process.env.PREVIEW_PORT || 4174)}/garden-study.html`);
} catch (error) { console.error(error.message); process.exitCode = 1; }
