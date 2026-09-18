export const ROLES = Object.freeze({ OWNER: 'owner', ADMIN: 'admin', MODERATOR: 'moderator', PLAYER: 'player', GUEST: 'guest' });

export const PERMISSIONS = Object.freeze({
  CREATE_CARD: 'create_card',
  UPDATE_CARD: 'update_card',
  DELETE_CARD: 'delete_card',
  MANAGE_CATALOG: 'manage_catalog',
  BAN_PLAYER: 'ban_player',
  VIEW_AUDIT_LOGS: 'view_audit_logs',
  MANAGE_MARKETPLACE: 'manage_marketplace',
  MANAGE_EVENTS: 'manage_events',
});

const ROLE_PERMISSIONS = Object.freeze({
  [ROLES.OWNER]: Object.values(PERMISSIONS),
  [ROLES.ADMIN]: Object.values(PERMISSIONS),
  [ROLES.MODERATOR]: [PERMISSIONS.VIEW_AUDIT_LOGS, PERMISSIONS.BAN_PLAYER],
  [ROLES.PLAYER]: [],
  [ROLES.GUEST]: [],
});

const resolveRole = (user) => String(user?.role || user?.profile?.role || '').toLowerCase();

export function can(user, permission) {
  const role = resolveRole(user);
  return ROLE_PERMISSIONS[role]?.includes(permission) === true;
}

export function requirePermission(user, permission) {
  if (!can(user, permission)) {
    const error = new Error('PERMISSION_DENIED');
    error.code = 'PERMISSION_DENIED';
    error.permission = permission;
    throw error;
  }
  return true;
}

export const permissionService = Object.freeze({ can, require: requirePermission, roles: ROLES, permissions: PERMISSIONS });
export default permissionService;
