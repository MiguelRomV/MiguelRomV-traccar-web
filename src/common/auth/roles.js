export const ADMIN = "ADMIN";
export const MANAGER = "MANAGER";
export const VIEWER = "VIEWER";
export const rolePermissions = {
  [ADMIN]: ["*"],
  [MANAGER]: ["map", "events", "commands", "reports", "settings"],
  [VIEWER]: ["map", "events", "reports"],
};
