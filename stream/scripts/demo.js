import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { projectRoot } from '../src/config.js';
import { createApplication } from '../src/server.js';
import { prepareMedia } from '../src/media.js';

export async function seedDemo(app) {
  if (app.store.list({ limit:1 }).length) return;
  const recipe = app.store.save({ body:'## pork + cabbage dumplings v3\n\n300g pork mince\n200g cabbage, salted + squeezed\n20g ginger · 2 spring onions\n1 tbsp light soy · 1 tsp sesame oil\n60g cold water\n\nStir water into the pork a little at a time until sticky. Fold in everything else. About 20g filling per wrapper. Pan-fry, add water, cover for 6 minutes, then uncover to crisp.\n\nMore ginger than v2. Much better.', tags:['cooking'], createdAt:'2026-10-23T07:40:00.000Z' });
  const photo = await prepareMedia([{ field:'photo', name:'morning-coffee.jpg', declaredMime:'image/jpeg', buffer:await readFile(path.join(projectRoot,'examples/coffee.jpg')) }], app.config.dataDir);
  app.store.save({ body:'Filter coffee. Ethiopia, Guji.\n15g / 250g · 94°C · 2:45\n\nA little coarser today. sweeter. Keeping this one.', tags:['coffee'], createdAt:'2026-10-23T21:16:00.000Z', attachmentMeta:{ photo:{alt:'A Chemex on a kitchen counter beside a window.'} } }, photo);
  const audio = await prepareMedia([{ field:'audio', name:'reflection-note.m4a', declaredMime:'audio/mp4', buffer:await readFile(path.join(projectRoot,'examples/reflection.m4a')) }], app.config.dataDir);
  app.store.save({ body:'Trying to see the invariant rather than just accept the proof.\n\n$$\\|P-A\\| = \\|P^{\\prime}-A\\|$$\n\nA small version to play with:\n\n```js\nconst reflect = ({ x, y }) => ({\n  x: -x,\n  y,\n});\n```', tags:['maths'], createdAt:'2026-10-23T23:42:00.000Z', attachmentMeta:{ audio:{transcript:'I keep getting stuck on this reflection problem. If A sits on the mirror line, reflecting P should leave its distance from A unchanged. I want to move P around and see what stays the same.'} } }, audio);
  app.store.save({ body:`[[${recipe.id}|dumplings v3]] — filling tastes good, still too wet.\n\nFor v4: squeeze the cabbage properly before weighing it. Try 30g less water. Thinner edges on the wrappers too.`, tags:['cooking'], createdAt:'2026-10-24T00:36:00.000Z' });
  app.store.save({ body:'8km, 5:30 pace. kinda tuff.\nKept thinking about that reflection problem on the way home.', tags:['running'], createdAt:'2026-10-24T01:04:00.000Z' });
}

if (path.resolve(process.argv[1] || '') === fileURLToPath(import.meta.url)) {
  const publicPort = Number(process.env.DEMO_PUBLIC_PORT || 3433), editorPort = Number(process.env.DEMO_EDITOR_PORT || 3434);
  const app = createApplication({ dataDir:path.join(projectRoot,'.local/demo'), editorAccess:'local', editorOrigin:'', tailscaleOwner:'', publicHost:'127.0.0.1', publicPort, editorPort, publicOrigin:`http://127.0.0.1:${publicPort}`, demo:true });
  await seedDemo(app);
  if (process.argv.includes('--seed-only')) await app.close();
  else {
    const urls = await app.start();
    console.log(`Demo reader: ${urls.publicURL}\nDemo editor: ${urls.editorURL}\nSample posts only — separate storage: ${app.config.dataDir}`);
    for (const signal of ['SIGINT','SIGTERM']) process.once(signal, async () => { await app.close(); process.exit(0); });
  }
}
