import { readFile, writeFile, copyFile } from 'node:fs/promises';
import path from 'node:path';

// A local-only extension of the demo: its endless space never becomes a fake
// public post, and none of these study files are included by the site builder.
export async function createGardenStudy({outputDir}) {
  const source = await readFile(path.join(outputDir,'index.html'),'utf8');
  const html = source
    .replace('<title>ridge</title>','<title>Garden study · ridge</title><meta name="robots" content="noindex,nofollow">')
    .replace('</body>','<div id="garden-study-tail" aria-hidden="true" style="height:3200px"></div><div id="garden-study-end" aria-hidden="true" style="height:1px"></div><script type="module" src="/garden-study.js"></script></body>');
  await writeFile(path.join(outputDir,'garden-study.html'),html);
  await copyFile(new URL('../design/garden-study.js',import.meta.url),path.join(outputDir,'garden-study.js'));
}
