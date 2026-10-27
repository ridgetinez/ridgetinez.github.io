import http from 'node:http';
import path from 'node:path';
import { readFile, stat, realpath } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { projectRoot } from '../src/config.js';
import { inside } from '../src/files.js';

const types = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.xml':'application/xml; charset=utf-8','.txt':'text/plain; charset=utf-8','.svg':'image/svg+xml','.woff2':'font/woff2','.woff':'font/woff','.ttf':'font/ttf','.webp':'image/webp','.mp3':'audio/mpeg','.m4a':'audio/mp4','.wav':'audio/wav','.ogg':'audio/ogg','.flac':'audio/flac','.webm':'audio/webm'};

export async function previewSite({directory = path.join(projectRoot,'dist'),port = Number(process.env.PREVIEW_PORT || 4173), basePath = ''} = {}) {
  directory = await realpath(directory);
  const server = http.createServer(async (req,res) => {
    res.setHeader('Cache-Control','no-store');
    res.setHeader('X-Content-Type-Options','nosniff');
    if (!['GET','HEAD'].includes(req.method)) { req.resume(); res.writeHead(405,{'Allow':'GET, HEAD'}); res.end(); return; }
    try {
      const url = new URL(req.url,'http://ridge.invalid');
      const requested = decodeURIComponent(url.pathname);
      if (basePath && requested === basePath) { res.writeHead(302,{Location:basePath+'/'}); res.end(); return; }
      if (basePath && !requested.startsWith(basePath+'/')) throw new Error('Not found');
      let filename = path.resolve(directory,'.' + (requested.slice(basePath.length) || '/'));
      if (filename !== directory && !inside(directory,filename)) throw new Error('Not found');
      let info = await stat(filename);
      if (info.isDirectory()) {
        if (!requested.endsWith('/')) { res.writeHead(302,{Location:requested+'/'+url.search}); res.end(); return; }
        filename = path.join(filename,'index.html');
      }
      filename = await realpath(filename);
      if (!inside(directory,filename)) throw new Error('Not found');
      const buffer = await readFile(filename);
      const type = types[path.extname(filename)] || 'application/octet-stream';
      // Audio players need real byte-range responses during local preview too.
      let start = 0, end = buffer.length-1, status = 200;
      if (req.headers.range) {
        const match = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
        if (match && (match[1] || match[2])) {
          start = match[1] ? Number(match[1]) : Math.max(0,buffer.length-Number(match[2]));
          end = match[1] && match[2] ? Math.min(end,Number(match[2])) : end;
        } else start = -1;
        if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start<0 || start>end || start>=buffer.length) { res.writeHead(416,{'Content-Range':`bytes */${buffer.length}`}); res.end(); return; }
        status = 206; res.setHeader('Content-Range',`bytes ${start}-${end}/${buffer.length}`);
      }
      res.writeHead(status,{'Content-Type':type,'Content-Length':Math.max(0,end-start+1),'Accept-Ranges':'bytes'});
      res.end(req.method === 'HEAD' ? undefined : buffer.subarray(start,end+1));
    } catch {
      const body = await readFile(path.join(directory,'404.html')).catch(()=>Buffer.from('Not found'));
      res.writeHead(404,{'Content-Type':'text/html; charset=utf-8'}); res.end(req.method === 'HEAD' ? undefined : body);
    }
  });
  await new Promise((resolve,reject) => {server.once('error',reject);server.listen(port,'127.0.0.1',resolve);});
  const url = `http://127.0.0.1:${server.address().port}${basePath}/`;
  return {server,url,close:() => new Promise(resolve => {server.close(resolve);server.closeAllConnections();})};
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  try {
    const app = await previewSite({basePath:process.env.SITE_URL ? new URL(process.env.SITE_URL).pathname.replace(/\/$/,'') : ''});
    console.log(`Static reader: ${app.url}`);
    for (const signal of ['SIGINT','SIGTERM']) process.once(signal,async()=>{await app.close();process.exit(0);});
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
