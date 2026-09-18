export const ADMIN = "ADMIN";
export const MANAGER = "MANAGER";
export const VIEWER = "VIEWER";
export const rolePermissions = {
  [ADMIN]: ["*"],
  [MANAGER]: [
    "map",
    "dashboard",
    "events",
    "commands",
    "reports",
    "settings",
    "services",
    "deliveries",
    "expenses",
    "photos",
    "video",
    "chat",
    "help",
    "notifications",
  ],
  [VIEWER]: ["map", "events", "reports", "help", "notifications"],
};
