import path from 'node:path';
import { mkdtemp, mkdir, rename, rm, access, realpath } from 'node:fs/promises';

export const inside = (root, target) => target.startsWith(path.resolve(root) + path.sep);

export async function resolveDestination(target) {
  target = path.resolve(target);
  try { return await realpath(target); }
  catch (error) {
    if (error.code !== 'ENOENT') throw error;
    return path.join(await resolveDestination(path.dirname(target)),path.basename(target));
  }
}

// Only replace directories created by this tool. A failed conversion preserves
// the last successful snapshot, including media that have since been removed.
export async function replaceDirectory(target, marker, create) {
  target = path.resolve(target);
  await mkdir(path.dirname(target), { recursive:true });
  let exists = false;
  try { await access(target); exists = true; } catch (error) { if (error.code !== 'ENOENT') throw error; }
  if (exists) {
    try { await access(path.join(target, marker)); }
    catch { throw new Error(`Refusing to replace an unrecognised directory: ${target}`); }
  }
  const stage = await mkdtemp(path.join(path.dirname(target), '.ridge-stage-'));
  const previous = stage + '-previous';
  try {
    await create(stage);
    if (exists) await rename(target, previous);
    try { await rename(stage, target); }
    catch (error) { if (exists) await rename(previous, target); throw error; }
    if (exists) await rm(previous, { recursive:true, force:true });
  } finally { await rm(stage, { recursive:true, force:true }); }
}
