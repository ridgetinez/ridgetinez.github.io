import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { HttpError } from './config.js';

export const validId = value => typeof value === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9-]{0,79}$/.test(value);

export function normalizeTags(input) {
  const values = Array.isArray(input) ? input : String(input || '').split(',');
  return [...new Set(values.map(tag => String(tag).trim().replace(/^#/, '').toLowerCase()).filter(tag => /^[\p{L}\p{N}][\p{L}\p{N}-]{0,29}$/u.test(tag)))].slice(0, 8);
}

export function references(body) {
  const links = [...body.matchAll(/\[\[([a-zA-Z0-9-]+)\|/g), ...body.matchAll(/\]\(\/p\/([a-zA-Z0-9-]+)\)/g)];
  return [...new Set(links.map(match => match[1]).filter(validId))];
}

export function openStore(dataDir) {
  mkdirSync(path.join(dataDir, 'media'), { recursive: true });
  const filename = path.join(dataDir, 'ridge.sqlite');
  const writer = new DatabaseSync(filename);
  writer.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
    PRAGMA busy_timeout = 5000;
    CREATE TABLE IF NOT EXISTS posts (
      id TEXT PRIMARY KEY,
      body TEXT NOT NULL,
      tags TEXT NOT NULL DEFAULT '[]',
      links TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      archived_at TEXT
    ) STRICT;
    CREATE INDEX IF NOT EXISTS posts_date ON posts(created_at DESC, id DESC);
    CREATE TABLE IF NOT EXISTS attachments (
      id TEXT PRIMARY KEY,
      post_id TEXT NOT NULL REFERENCES posts(id),
      kind TEXT NOT NULL CHECK(kind IN ('image','audio')),
      filename TEXT NOT NULL,
      mime TEXT NOT NULL,
      name TEXT NOT NULL,
      alt TEXT NOT NULL DEFAULT '',
      transcript TEXT NOT NULL DEFAULT '',
      position INTEGER NOT NULL
    ) STRICT;
    PRAGMA user_version = 1;
  `);
  const reader = new DatabaseSync(filename, { readOnly: true });
  reader.exec('PRAGMA busy_timeout = 5000; PRAGMA query_only = ON;');

  const hydrate = row => row && ({
    ...row, tags: JSON.parse(row.tags), links: JSON.parse(row.links),
    attachments: reader.prepare('SELECT * FROM attachments WHERE post_id = ? ORDER BY position').all(row.id)
  });
  const get = (id, includeArchived = false) => hydrate(reader.prepare(`SELECT * FROM posts WHERE id = ? ${includeArchived ? '' : 'AND archived_at IS NULL'}`).get(id));
  const list = ({ tag = '', archived = false, before = '', limit = 30 } = {}) => {
    const params = [archived ? 1 : 0];
    let query = 'SELECT * FROM posts WHERE (archived_at IS NOT NULL) = ?';
    if (tag) { query += ' AND EXISTS (SELECT 1 FROM json_each(posts.tags) WHERE value = ?)'; params.push(tag); }
    if (before) {
      const cursor = get(before, archived);
      if (!cursor) throw new HttpError(400, 'Invalid page cursor.');
      query += ' AND (created_at < ? OR (created_at = ? AND id < ?))';
      params.push(cursor.created_at, cursor.created_at, cursor.id);
    }
    query += ' ORDER BY created_at DESC, id DESC LIMIT ?'; params.push(Math.min(1000, limit));
    return reader.prepare(query).all(...params).map(hydrate);
  };
  const tags = () => reader.prepare(`SELECT DISTINCT value AS tag FROM posts, json_each(posts.tags) WHERE archived_at IS NULL ORDER BY value`).all().map(row => row.tag);
  const backlinks = id => reader.prepare(`SELECT * FROM posts WHERE archived_at IS NULL AND EXISTS (SELECT 1 FROM json_each(posts.links) WHERE value = ?) ORDER BY created_at DESC`).all(id).map(hydrate);
  const media = (id, includeArchived = false) => reader.prepare(`SELECT attachments.* FROM attachments JOIN posts ON posts.id = attachments.post_id WHERE attachments.id = ? ${includeArchived ? '' : 'AND posts.archived_at IS NULL'}`).get(id);

  function save(input, files = [], editingId = '') {
    const old = editingId ? get(editingId, true) : null;
    if (editingId && !old) throw new HttpError(404, 'Post not found.');
    const body = String(input.body || '').trim();
    if (body.length > 30000) throw new HttpError(400, 'Keep entries under 30,000 characters.');
    const keep = old ? old.attachments.filter(a => !input.removeAttachments?.includes(a.id)) : [];
    if (!body && !keep.length && !files.length) throw new HttpError(400, 'Add text, a photo or an audio note.');
    if (keep.length + files.length > 6) throw new HttpError(400, 'An entry can have up to six attachments.');
    const date = new Date(input.createdAt || old?.created_at || Date.now());
    if (Number.isNaN(date.getTime())) throw new HttpError(400, 'Invalid post date.');
    const now = new Date().toISOString(), id = old?.id || randomUUID();
    const tags = normalizeTags(input.tags || []);
    const metadata = input.attachmentMeta || {};
    writer.exec('BEGIN IMMEDIATE');
    try {
      if (old) writer.prepare('UPDATE posts SET body=?, tags=?, links=?, created_at=?, updated_at=? WHERE id=?').run(body, JSON.stringify(tags), JSON.stringify(references(body)), date.toISOString(), now, id);
      else writer.prepare('INSERT INTO posts(id,body,tags,links,created_at,updated_at) VALUES(?,?,?,?,?,?)').run(id, body, JSON.stringify(tags), JSON.stringify(references(body)), date.toISOString(), now);
      if (old) {
        for (const attachment of old.attachments) {
          if (!keep.includes(attachment)) writer.prepare('DELETE FROM attachments WHERE id=?').run(attachment.id);
          else {
            const change = metadata[attachment.id] || {};
            writer.prepare('UPDATE attachments SET alt=?, transcript=?, position=? WHERE id=?').run(String(change.alt ?? attachment.alt).slice(0, 1000), String(change.transcript ?? attachment.transcript).slice(0, 30000), keep.indexOf(attachment), attachment.id);
          }
        }
      }
      for (const [index, file] of files.entries()) {
        const change = metadata[file.field] || {};
        writer.prepare('INSERT INTO attachments(id,post_id,kind,filename,mime,name,alt,transcript,position) VALUES(?,?,?,?,?,?,?,?,?)').run(file.id, id, file.kind, file.filename, file.mime, file.name, String(change.alt || '').slice(0, 1000), String(change.transcript || '').slice(0, 30000), keep.length + index);
      }
      writer.exec('COMMIT');
    } catch (error) { writer.exec('ROLLBACK'); throw error; }
    return get(id, true);
  }
  function archive(id, archived) {
    if (!get(id, true)) throw new HttpError(404, 'Post not found.');
    writer.prepare('UPDATE posts SET archived_at=?, updated_at=? WHERE id=?').run(archived ? new Date().toISOString() : null, new Date().toISOString(), id);
  }
  return { filename, reader, writer, get, list, tags, backlinks, media, save, archive, close() { reader.close(); writer.close(); } };
}
