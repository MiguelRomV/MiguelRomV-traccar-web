import { useSelector } from "react-redux";
import { ADMIN, MANAGER, VIEWER, rolePermissions } from "./roles";
const useCurrentRole = () => {
  const user = useSelector((state) => state.session.user);
  const role = user?.administrator
    ? ADMIN
    : user?.attributes?.role === MANAGER
      ? MANAGER
      : user?.attributes?.role === VIEWER
        ? VIEWER
        : ADMIN;
  return {
    role,
    can: (action) =>
      rolePermissions[role].includes("*") ||
      rolePermissions[role].includes(action),
  };
};
export default useCurrentRole;
