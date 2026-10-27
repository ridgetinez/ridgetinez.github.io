import Busboy from 'busboy';
import { fileTypeFromBuffer } from 'file-type';
import sharp from 'sharp';
import { randomUUID } from 'node:crypto';
import { writeFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { HttpError } from './config.js';

const FILE_LIMIT = 15 * 1024 * 1024;
const TOTAL_LIMIT = 30 * 1024 * 1024;
const images = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif']);
const audio = new Map([
  ['audio/mpeg', ['mp3', 'audio/mpeg']], ['audio/wav', ['wav', 'audio/wav']],
  ['audio/x-wav', ['wav', 'audio/wav']], ['audio/ogg', ['ogg', 'audio/ogg']],
  ['audio/opus', ['ogg', 'audio/ogg']], ['audio/flac', ['flac', 'audio/flac']],
  ['audio/mp4', ['m4a', 'audio/mp4']], ['audio/x-m4a', ['m4a', 'audio/mp4']],
  ['video/mp4', ['m4a', 'audio/mp4']], ['video/webm', ['webm', 'audio/webm']],
  ['audio/webm', ['webm', 'audio/webm']]
]);

export async function readJSON(req, max = 1024 * 1024) {
  let size = 0; const chunks = [];
  for await (const chunk of req) { size += chunk.length; if (size > max) throw new HttpError(413, 'Request is too large.'); chunks.push(chunk); }
  try { const value = JSON.parse(Buffer.concat(chunks).toString('utf8')); if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(); return value; }
  catch { throw new HttpError(400, 'Invalid JSON.'); }
}

export async function readPost(req) {
  if (req.headers['content-type']?.startsWith('application/json')) return { input: await readJSON(req), files: [] };
  if (!req.headers['content-type']?.startsWith('multipart/form-data')) throw new HttpError(415, 'Use JSON or multipart form data.');
  return new Promise((resolve, reject) => {
    let parser;
    try { parser = Busboy({ headers: req.headers, limits: { files: 6, fields: 1, fileSize: FILE_LIMIT, fieldSize: 250000, parts: 7 } }); }
    catch { reject(new HttpError(400, 'Invalid upload.')); return; }
    let input, total = 0, failed = false; const files = [];
    const fail = error => { if (failed) return; failed = true; req.unpipe(parser); req.resume(); reject(error); };
    const count = chunk => { total += chunk.length; if (total > TOTAL_LIMIT) fail(new HttpError(413, 'Keep each post under 30 MB.')); };
    req.on('data', count);
    parser.on('field', (name, value, info) => {
      if (name !== 'post' || info.valueTruncated) return fail(new HttpError(400, 'Invalid post metadata.'));
      try { input = JSON.parse(value); } catch { fail(new HttpError(400, 'Invalid post metadata.')); }
    });
    parser.on('file', (field, stream, info) => {
      const chunks = [];
      stream.on('data', chunk => { if (!failed) chunks.push(chunk); });
      stream.on('limit', () => fail(new HttpError(413, 'Each attachment must be under 15 MB.')));
      stream.on('error', fail);
      stream.on('end', () => { if (!failed) files.push({ field, name: info.filename.slice(0, 200), declaredMime: info.mimeType, buffer: Buffer.concat(chunks) }); });
    });
    parser.on('filesLimit', () => fail(new HttpError(400, 'Up to six attachments per post.')));
    parser.on('fieldsLimit', () => fail(new HttpError(400, 'Unexpected upload fields.')));
    parser.on('partsLimit', () => fail(new HttpError(400, 'Too many upload parts.')));
    parser.on('error', () => fail(new HttpError(400, 'Upload could not be read.')));
    req.on('aborted', () => fail(new HttpError(400, 'Upload interrupted.')));
    parser.on('close', () => {
      req.off('data', count);
      if (failed) return;
      if (!input || typeof input !== 'object' || Array.isArray(input)) return reject(new HttpError(400, 'Post metadata is missing.'));
      resolve({ input, files });
    });
    req.pipe(parser);
  });
}

export async function prepareMedia(files, dataDir) {
  const saved = [];
  try {
    for (const file of files) {
      let type;
      try { type = await fileTypeFromBuffer(file.buffer); }
      catch { throw new HttpError(415, 'That attachment is incomplete or unsupported.'); }
      if (!type) throw new HttpError(415, 'That attachment format is not supported.');
      const id = randomUUID(); let buffer, kind, mime, extension;
      if (images.has(type.mime)) {
        kind = 'image'; mime = 'image/webp'; extension = 'webp';
        try { buffer = await sharp(file.buffer, { limitInputPixels: 40000000 }).rotate().resize({ width: 2200, height: 2200, fit: 'inside', withoutEnlargement: true }).webp({ quality: 88 }).toBuffer(); }
        catch { throw new HttpError(415, 'Could not read that photo. Try JPEG, PNG, WebP or AVIF.'); }
      } else if (audio.has(type.mime)) {
        if (type.mime.startsWith('video/') && !file.declaredMime.startsWith('audio/')) throw new HttpError(415, 'Use an audio file rather than video.');
        kind = 'audio'; [extension, mime] = audio.get(type.mime); buffer = file.buffer;
      } else throw new HttpError(415, 'Use a photo or audio file. SVG, HTML and other active formats are not accepted.');
      const filename = `${id}.${extension}`;
      await writeFile(path.join(dataDir, 'media', filename), buffer, { flag: 'wx', mode: 0o600 });
      saved.push({ id, filename, kind, mime, field: file.field, name: file.name });
    }
    return saved;
  } catch (error) { await discardMedia(saved, dataDir); throw error; }
}

export async function discardMedia(files, dataDir) {
  await Promise.all(files.map(file => rm(path.join(dataDir, 'media', file.filename), { force: true })));
}
