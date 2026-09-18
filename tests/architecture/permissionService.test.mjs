import assert from 'node:assert/strict';
import { can, requirePermission, PERMISSIONS } from '../../services/architecture/permissionService.js';
assert.equal(can({ role: 'admin' }, PERMISSIONS.MANAGE_CATALOG), true);
assert.equal(can({ role: 'player' }, PERMISSIONS.MANAGE_CATALOG), false);
assert.equal(can({ role: 'moderator' }, PERMISSIONS.VIEW_AUDIT_LOGS), true);
assert.equal(can({ role: 'moderator' }, PERMISSIONS.CREATE_CARD), false);
assert.doesNotThrow(() => requirePermission({ role: 'admin' }, PERMISSIONS.MANAGE_CATALOG));
assert.throws(() => requirePermission({ role: 'player' }, PERMISSIONS.MANAGE_CATALOG), /PERMISSION_DENIED/);
console.log('permissionService: ok');
