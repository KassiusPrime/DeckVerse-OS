import assert from 'node:assert/strict';
const flagNames=['economy_v2','gacha_v2','guild_wars','auction_house','season_pass','event_system'];
assert.equal(new Set(flagNames).size,flagNames.length);assert.ok(flagNames.includes('economy_v2'));assert.ok(flagNames.includes('gacha_v2'));console.log('feature flags: ok');
