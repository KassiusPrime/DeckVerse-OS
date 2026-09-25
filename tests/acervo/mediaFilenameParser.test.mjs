import assert from 'node:assert/strict';
import { parseMediaFilename } from '../../services/media/mediaFilenameParser.js';

const valid = parseMediaFilename('COL-99-NEW_character_sung_jin_woo.jpg');
assert.equal(valid.valid, true);
assert.equal(valid.collectionCodeCanonical, 'COL-99-NEW');
assert.equal(valid.entityType, 'character');
assert.equal(valid.slug, 'sung_jin_woo');

const dynamic = parseMediaFilename('COL-12-NEW_WORLD_boss_final_boss.webp');
assert.equal(dynamic.valid, true);
assert.equal(dynamic.entityType, 'boss');

const cover = parseMediaFilename('COL-07-BNHA_collection_cover.png');
assert.equal(cover.valid, true);
assert.equal(cover.entityType, 'collection');

const form = parseMediaFilename('COL-07-BNHA_character_gojo_form_blue.png');
assert.equal(form.valid, true);
assert.equal(form.stateType, 'form');
assert.equal(form.baseSlug, 'gojo');

const traversal = parseMediaFilename('../COL-07-BNHA_character_bad.png');
assert.equal(traversal.valid, false);
assert.equal(traversal.error, 'PATH_TRAVERSAL_ATTEMPT');

const badExtension = parseMediaFilename('COL-07-BNHA_character_gojo.svg');
assert.equal(badExtension.valid, false);
assert.equal(badExtension.error, 'INVALID_EXTENSION');

console.log('Acervo media parser tests: PASS');
