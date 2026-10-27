import http from 'node:http';
import path from 'node:path';
import { readFile, stat } from 'node:fs/promises';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { configuration, projectRoot, HttpError } from './config.js';
import { openStore, validId } from './store.js';
import { readPost, readJSON, prepareMedia, discardMedia } from './media.js';
import { renderPage, renderRSS } from './render.js';
import { renderMarkdown } from './markdown.js';

const types = { '.css':'text/css; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.svg':'image/svg+xml', '.woff2':'font/woff2', '.woff':'font/woff', '.ttf':'font/ttf' };
const loopback = address => address === '127.0.0.1' || address === '::1' || address === '::ffff:127.0.0.1';

function headers(res, editor) {
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; media-src 'self' blob:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'");
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Permissions-Policy', `camera=(), geolocation=(), microphone=${editor ? '(self)' : '()'}`);
  res.setHeader('Cache-Control', editor ? 'no-store' : 'no-cache');
  if (editor) res.setHeader('X-Robots-Tag', 'noindex, nofollow');
}

function send(req, res, status, content, type = 'application/json; charset=utf-8') {
  const body = Buffer.isBuffer(content) ? content : Buffer.from(typeof content === 'string' ? content : JSON.stringify(content));
  res.writeHead(status, { 'Content-Type':type, 'Content-Length':body.length });
  res.end(req.method === 'HEAD' ? undefined : body);
}

async function staticFile(req, res, directory, relative) {
  const filename = path.resolve(directory, relative);
  if (!filename.startsWith(path.resolve(directory) + path.sep)) throw new HttpError(404, 'Not found.');
  const info = await stat(filename).catch(() => null);
  if (!info?.isFile()) throw new HttpError(404, 'Not found.');
  const buffer = await readFile(filename);
  res.setHeader('Cache-Control', 'public, max-age=3600');
  send(req, res, 200, buffer, types[path.extname(filename)] || 'application/octet-stream');
}

export function createApplication(options = {}) {
  const config = configuration(options), store = openStore(config.dataDir);
  const csrf = randomBytes(32).toString('base64url');
  let editorPort = config.editorPort, closed = false;

  function authorize(req) {
    if (!loopback(req.socket.remoteAddress)) throw new HttpError(403, 'The editor only accepts loopback proxy connections.');
    const host = req.headers.host || '';
    if (config.editorAccess === 'local') {
      if (![ `127.0.0.1:${editorPort}`, `localhost:${editorPort}` ].includes(host)) throw new HttpError(403, 'Use the local editor URL.');
    } else {
      if (host !== new URL(config.editorOrigin).host || req.headers['tailscale-user-login'] !== config.tailscaleOwner) {
        throw new HttpError(403, 'This editor is private to its owner.');
      }
    }
    if (!['GET', 'HEAD'].includes(req.method)) {
      const origin = req.headers.origin;
      const allowed = config.editorAccess === 'tailscale' ? [config.editorOrigin] : [`http://127.0.0.1:${editorPort}`, `http://localhost:${editorPort}`];
      if (!origin || !allowed.includes(origin)) throw new HttpError(403, 'This request did not come from the editor.');
      const token = Buffer.from(String(req.headers['x-csrf-token'] || ''));
      const expected = Buffer.from(csrf);
      if (token.length !== expected.length || !timingSafeEqual(token, expected)) throw new HttpError(403, 'Refresh the editor before posting.');
    }
  }

  function handler(editor) {
    return async (req, res) => {
      headers(res, editor);
      try {
        // This check is deliberately before routing and ignores identity headers.
        if (!editor && !['GET', 'HEAD'].includes(req.method)) {
          req.resume(); res.setHeader('Allow', 'GET, HEAD');
          throw new HttpError(405, 'The public site is read-only.');
        }
        if (editor) authorize(req);
        const url = new URL(req.url, 'http://ridge.invalid');
        const pathname = decodeURIComponent(url.pathname);
        if (['GET', 'HEAD'].includes(req.method)) {
          if (pathname === '/health') return send(req, res, 200, { ok:true });
          if (pathname.startsWith('/assets/katex/')) return await staticFile(req, res, path.join(projectRoot, 'node_modules/katex/dist'), pathname.slice('/assets/katex/'.length));
          if (pathname.startsWith('/assets/fonts/')) return await staticFile(req, res, path.join(projectRoot, 'node_modules/@fontsource-variable/inter/files'), pathname.slice('/assets/fonts/'.length));
          if (pathname.startsWith('/assets/')) return await staticFile(req, res, path.join(projectRoot, 'public'), pathname.slice('/assets/'.length));
          if (pathname.startsWith('/media/')) {
            const attachment = store.media(pathname.slice('/media/'.length), editor);
            if (!attachment) throw new HttpError(404, 'Media not found.');
            const buffer = await readFile(path.join(config.dataDir, 'media', attachment.filename));
            res.setHeader('Content-Disposition', 'inline');
            res.setHeader('Accept-Ranges', 'bytes');
            if (req.headers.range) {
              const match = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
              let start = 0, end = buffer.length - 1;
              if (!match || (!match[1] && !match[2])) throw new HttpError(416, 'Invalid byte range.');
              if (!match[1]) start = Math.max(0, buffer.length - Number(match[2]));
              else { start = Number(match[1]); if (match[2]) end = Math.min(end, Number(match[2])); }
              if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start > end || start >= buffer.length) {
                res.setHeader('Content-Range', `bytes */${buffer.length}`);
                throw new HttpError(416, 'Invalid byte range.');
              }
              res.setHeader('Content-Range', `bytes ${start}-${end}/${buffer.length}`);
              return send(req, res, 206, buffer.subarray(start, end + 1), attachment.mime);
            }
            return send(req, res, 200, buffer, attachment.mime);
          }
          if (pathname === '/feed.xml') return send(req, res, 200, renderRSS(store.list({ limit:100 }), config.publicOrigin), 'application/rss+xml; charset=utf-8');
          if (pathname === '/robots.txt') return send(req, res, 200, editor ? 'User-agent: *\nDisallow: /\n' : 'User-agent: *\nAllow: /\n', 'text/plain; charset=utf-8');
          if (pathname === '/api/posts') return send(req, res, 200, store.list({ tag:url.searchParams.get('tag') || '', archived:editor && url.searchParams.get('archived') === '1', before:url.searchParams.get('before') || '' }));
          if (pathname.startsWith('/api/posts/')) {
            const post = store.get(pathname.slice('/api/posts/'.length), editor);
            if (!post) throw new HttpError(404, 'Post not found.');
            return send(req, res, 200, post);
          }
          if (pathname === '/' || pathname.startsWith('/p/')) {
            const single = pathname !== '/', id = pathname.slice(3);
            const tag = url.searchParams.get('tag') || '', archived = editor && url.searchParams.get('archived') === '1';
            const posts = single ? [store.get(id, editor)].filter(Boolean) : store.list({ tag, archived, before:url.searchParams.get('before') || '', limit:31 });
            if (single && (!validId(id) || !posts.length)) throw new HttpError(404, 'Post not found.');
            const hasMore = posts.length > 30;
            return send(req, res, 200, renderPage({ posts:posts.slice(0,30), tags:store.tags(), store, config, editor, csrf, tag, archived, single, hasMore }), 'text/html; charset=utf-8');
          }
        }
        if (editor && req.method === 'POST' && pathname === '/api/preview') {
          const input = await readJSON(req);
          if (typeof input.body !== 'string' || input.body.length > 30000) throw new HttpError(400, 'Preview text is too large.');
          return send(req, res, 200, { html:renderMarkdown(input.body) });
        }
        if (editor && req.method === 'POST' && (pathname === '/api/posts' || /^\/api\/posts\/[a-zA-Z0-9-]+$/.test(pathname))) {
          const editingId = pathname === '/api/posts' ? '' : pathname.split('/').at(-1);
          const { input, files } = await readPost(req);
          const saved = await prepareMedia(files, config.dataDir);
          try {
            const post = store.save(input, saved, editingId);
            return send(req, res, editingId ? 200 : 201, { post });
          } catch (error) { await discardMedia(saved, config.dataDir); throw error; }
        }
        if (editor && req.method === 'POST' && /^\/api\/posts\/[a-zA-Z0-9-]+\/archive$/.test(pathname)) {
          const input = await readJSON(req);
          if (typeof input.archived !== 'boolean') throw new HttpError(400, 'Specify whether to archive this post.');
          store.archive(pathname.split('/')[3], input.archived);
          return send(req, res, 200, { ok:true });
        }
        throw new HttpError(404, 'Not found.');
      } catch (error) {
        const status = error instanceof URIError ? 400 : error.status || 500;
        if (status === 500) console.error(error);
        if (!res.headersSent) send(req, res, status, { error:status === 500 ? 'Something went wrong. Your entry was not saved.' : error.message });
        else res.end();
      }
    };
  }
  const publicServer = http.createServer({ maxHeaderSize:16384 }, handler(false));
  const editorServer = http.createServer({ maxHeaderSize:16384 }, handler(true));
  for (const server of [publicServer, editorServer]) { server.requestTimeout = 60000; server.headersTimeout = 15000; }
  const listen = (server, port, host) => new Promise((resolve, reject) => { server.once('error', reject); server.listen(port, host, () => { server.off('error', reject); resolve(server.address().port); }); });
  return {
    config, store, publicServer, editorServer,
    async start() {
      try {
        const publicPort = await listen(publicServer, config.publicPort, config.publicHost);
        // This listener is never configurable to bind to a public interface.
        editorPort = await listen(editorServer, config.editorPort, '127.0.0.1');
        return { publicURL:`http://127.0.0.1:${publicPort}`, editorURL:config.editorAccess === 'tailscale' ? config.editorOrigin : `http://127.0.0.1:${editorPort}` };
      } catch (error) { await this.close(); throw error; }
    },
    async close() {
      if (closed) return;
      closed = true;
      await Promise.all([publicServer,editorServer].map(server => new Promise(resolve => { if (!server.listening) return resolve(); server.close(resolve); server.closeAllConnections(); })));
      store.close();
    }
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const app = createApplication();
  const urls = await app.start();
  console.log(`Public reader: ${urls.publicURL}\nPrivate editor: ${urls.editorURL}\nStorage: ${app.config.dataDir}`);
  for (const signal of ['SIGINT','SIGTERM']) process.once(signal, async () => { await app.close(); process.exit(0); });
}
