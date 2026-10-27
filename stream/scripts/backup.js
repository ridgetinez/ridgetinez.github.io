import { DatabaseSync, backup } from 'node:sqlite';
import { mkdir, cp, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { configuration } from '../src/config.js';

const config = configuration();
const base = path.resolve(process.argv[2] || path.join(config.dataDir,'backups'));
const destination = path.join(base, new Date().toISOString().replace(/[:.]/g,'-'));
await mkdir(destination, {recursive:true});
const database = new DatabaseSync(path.join(config.dataDir,'ridge.sqlite'), {readOnly:true});
try {
  await backup(database, path.join(destination,'ridge.sqlite'));
  await cp(path.join(config.dataDir,'media'), path.join(destination,'media'), {recursive:true});
  await writeFile(path.join(destination,'backup.json'), JSON.stringify({version:1,createdAt:new Date().toISOString()},null,2));
  console.log(`Backup saved: ${destination}`);
} finally { database.close(); }
