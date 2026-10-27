import test from 'node:test';
import assert from 'node:assert/strict';
import { gardenPatch, visibleGardenBands, GARDEN_PROFILES, createGardenCache } from '../public/garden.js';

test('garden coordinates regenerate the same plants after visiting distant patches', () => {
  const first = gardenPatch('left',1);
  for (let index=500;index<600;index++) gardenPatch('right',index);
  assert.deepEqual(gardenPatch('left',1),first);
  assert.notDeepEqual(gardenPatch('right',1),first);
  assert.notDeepEqual(gardenPatch('left',1,1234),first);
  assert.ok(Number.isFinite(gardenPatch('left',1000000000).members[0].scale));
  assert.throws(()=>gardenPatch('left',-1),/Invalid/);
});

test('patches have coherent real-plant profiles and varied leaf shapes, sizes and bunching', () => {
  const profiles = new Set(), scales = new Set(), ripples = new Set(), counts = new Set();
  for (let index=0;index<300;index++) for (const side of ['left','right']) {
    const patch = gardenPatch(side,index);
    profiles.add(patch.name); counts.add(patch.members.length);
    assert.equal(patch.name,GARDEN_PROFILES[patch.profile].name);
    assert.ok(patch.members.length>=4 && patch.members.length<=7);
    assert.equal(new Set(patch.members.map(item=>item.id)).size,patch.members.length);
    for (const item of patch.members) {
      assert.equal(item.profile,patch.profile);
      assert.ok(item.scale>.4 && item.scale<1.4);
      assert.ok(item.oval>=.86 && item.oval<=1);
      assert.ok(item.ripple>=.012 && item.ripple<.047);
      assert.ok(['leaf','nasturtium'].includes(item.kind));
      scales.add(item.scale.toFixed(2)); ripples.add(item.ripple.toFixed(3));
    }
  }
  assert.equal(profiles.size,GARDEN_PROFILES.length);
  assert.ok(scales.size>50); assert.ok(ripples.size>20); assert.ok(counts.size>=3);
  assert.equal(GARDEN_PROFILES[gardenPatch('left',1).profile].mottled,true);
  assert.equal(gardenPatch('right',1).name,'empress');
});

test('visible work stays bounded as the document becomes arbitrarily long', () => {
  for (const height of [720,900,1440]) for (const offset of [0,1000,1000000,1000000000]) {
    const [first,last] = visibleGardenBands(offset,height,height*.78);
    assert.ok(first>=0); assert.ok(last>=first);
    assert.ok(last-first<=Math.ceil((height+680)/440)+1);
  }
  let creations = 0;
  const cache = createGardenCache(traits => {creations++; return {seed:traits.seed};});
  const original = cache.get('first',{seed:42});
  assert.equal(cache.get('first',{seed:42}),original);
  assert.equal(creations,1);
  for (let i=0;i<10000;i++) cache.get(`texture-${i}`,{seed:i});
  assert.equal(cache.size,48);
  assert.deepEqual(cache.get('first',{seed:42}),original);
  assert.notEqual(cache.get('first',{seed:42}),original);
  assert.equal(cache.size,48);
});
