import { useCallback, useReducer, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Table,
  TableRow,
  TableCell,
  TableHead,
  TableBody,
  Switch,
  TableFooter,
  FormControlLabel,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Select,
  MenuItem,
  Snackbar,
} from "@mui/material";
import LoginIcon from "@mui/icons-material/Login";
import LinkIcon from "@mui/icons-material/Link";
import {
  useCatch,
  useAsyncTask,
  useScrollToLoad,
  pageSize,
} from "../reactHelper";
import { formatBoolean, formatTime } from "../common/util/formatter";
import { useTranslation } from "../common/components/LocalizationProvider";
import PageLayout from "../common/components/PageLayout";
import SettingsMenu from "./components/SettingsMenu";
import CollectionFab from "./components/CollectionFab";
import CollectionActions from "./components/CollectionActions";
import TableShimmer from "../common/components/TableShimmer";
import { useManager } from "../common/util/permissions";
import SearchHeader from "./components/SearchHeader";
import useSettingsStyles from "./common/useSettingsStyles";
import fetchOrThrow from "../common/util/fetchOrThrow";
import UserDevicesValue from "./components/UserDevicesValue";
import useCurrentRole from "../common/auth/useCurrentRole";

const UsersPage = () => {
  const { classes } = useSettingsStyles();
  const navigate = useNavigate();
  const t = useTranslation();

  const manager = useManager();
  const { role } = useCurrentRole();
  const [editor, setEditor] = useState(null);
  const [toast, setToast] = useState("");

  const [reloadKey, reload] = useReducer((k) => k + 1, 0);
  const [items, setItems] = useState([]);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [hasMore, setHasMore] = useState(true);
  const [temporary, setTemporary] = useState(false);

  const handleLogin = useCatch(async (userId) => {
    await fetchOrThrow(`/api/session/${userId}`);
    window.location.replace("/");
  });

  const actionLogin = {
    key: "login",
    title: t("loginLogin"),
    icon: <LoginIcon fontSize="small" />,
    handler: handleLogin,
  };

  const actionConnections = {
    key: "connections",
    title: t("sharedConnections"),
    icon: <LinkIcon fontSize="small" />,
    handler: (userId) => navigate(`/settings/user/${userId}/connections`),
  };

  const loadItems = useCallback(
    async (offset, signal) => {
      const query = new URLSearchParams({
        excludeAttributes: true,
        limit: pageSize,
        offset,
      });
      if (searchKeyword) {
        query.append("keyword", searchKeyword);
      }
      const response = await fetchOrThrow(`/api/users?${query.toString()}`, {
        signal,
      });
      const data = await response.json();
      setItems((previous) => (offset ? [...previous, ...data] : data));
      setHasMore(data.length >= pageSize);
    },
    [searchKeyword],
  );

  const sentinelRef = useScrollToLoad(() => loadItems(items.length));
  const saveUser = async (user, method = "PUT") => {
    try {
      await fetchOrThrow(
        method === "POST" ? "/api/users" : `/api/users/${user.id}`,
        {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(user),
        },
      );
      setEditor(null);
      reload();
    } catch (error) {
      setToast(error.message);
    }
  };
  const changeRole = (item, nextRole) =>
    saveUser({
      ...item,
      attributes: { ...(item.attributes || {}), role: nextRole },
    });

  useAsyncTask(
    async ({ signal }) => {
      void reloadKey;
      setItems([]);
      await loadItems(0, signal);
    },
    [reloadKey, loadItems],
  );

  return (
    <PageLayout
      menu={<SettingsMenu />}
      breadcrumbs={["settingsTitle", "settingsUsers"]}
    >
      <SearchHeader keyword={searchKeyword} setKeyword={setSearchKeyword} />
      {role === "ADMIN" && (
        <Button
          variant="contained"
          sx={{ m: 1 }}
          onClick={() => setEditor({ attributes: { role: "VIEWER" } })}
        >
          Nuevo usuario
        </Button>
      )}
      <Table className={classes.table}>
        <TableHead>
          <TableRow>
            <TableCell>{t("sharedName")}</TableCell>
            <TableCell>{t("userEmail")}</TableCell>
            <TableCell>{t("userAdmin")}</TableCell>
            <TableCell>Rol</TableCell>
            <TableCell>{t("sharedDisabled")}</TableCell>
            <TableCell>{t("userExpirationTime")}</TableCell>
            <TableCell>{t("deviceTitle")}</TableCell>
            <TableCell className={classes.columnAction} />
          </TableRow>
        </TableHead>
        <TableBody>
          {items
            .filter((u) => temporary || !u.temporary)
            .map((item) => (
              <TableRow key={item.id}>
                <TableCell>{item.name}</TableCell>
                <TableCell>{item.email}</TableCell>
                <TableCell>{formatBoolean(item.administrator, t)}</TableCell>
                <TableCell>
                  <Select
                    size="small"
                    value={item.attributes?.role || "ADMIN"}
                    onChange={(event) => changeRole(item, event.target.value)}
                  >
                    <MenuItem value="ADMIN">Administrador</MenuItem>
                    <MenuItem value="MANAGER">Gestor</MenuItem>
                    <MenuItem value="VIEWER">Solo lectura</MenuItem>
                  </Select>
                </TableCell>
                <TableCell>{formatBoolean(item.disabled, t)}</TableCell>
                <TableCell>{formatTime(item.expirationTime, "date")}</TableCell>
                <TableCell>
                  <UserDevicesValue userId={item.id} />
                </TableCell>
                <TableCell className={classes.columnAction} padding="none">
                  <CollectionActions
                    itemId={item.id}
                    editPath="/settings/user"
                    endpoint="users"
                    onReload={reload}
                    customActions={
                      manager
                        ? [actionLogin, actionConnections]
                        : [actionConnections]
                    }
                  />
                  <Button size="small" onClick={() => setEditor(item)}>
                    Editar
                  </Button>
                  <Button
                    size="small"
                    onClick={() =>
                      saveUser({ ...item, disabled: !item.disabled })
                    }
                  >
                    {item.disabled ? "Reactivar" : "Desactivar"}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          {hasMore && (
            <TableShimmer
              ref={items.length > 0 ? sentinelRef : null}
              columns={7}
              endAction
            />
          )}
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell colSpan={7} align="right">
              <FormControlLabel
                control={
                  <Switch
                    value={temporary}
                    onChange={(e) => setTemporary(e.target.checked)}
                    size="small"
                  />
                }
                label={t("userTemporary")}
                labelPlacement="start"
              />
            </TableCell>
          </TableRow>
        </TableFooter>
      </Table>
      <CollectionFab editPath="/settings/user" />
      <Dialog
        open={Boolean(editor)}
        onClose={() => setEditor(null)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>
          {editor?.id ? "Editar usuario" : "Nuevo usuario"}
        </DialogTitle>
        <DialogContent sx={{ display: "grid", gap: 2, pt: 1 }}>
          <TextField
            label="Nombre"
            value={editor?.name || ""}
            onChange={(e) => setEditor({ ...editor, name: e.target.value })}
          />
          <TextField
            label="Email"
            value={editor?.email || ""}
            onChange={(e) => setEditor({ ...editor, email: e.target.value })}
          />
          {!editor?.id && (
            <TextField
              label="Contraseña"
              type="password"
              onChange={(e) =>
                setEditor({ ...editor, password: e.target.value })
              }
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditor(null)}>Cancelar</Button>
          <Button onClick={() => saveUser(editor, editor.id ? "PUT" : "POST")}>
            Confirmar
          </Button>
        </DialogActions>
      </Dialog>
      <Snackbar
        open={Boolean(toast)}
        message={toast}
        autoHideDuration={5000}
        onClose={() => setToast("")}
      />
    </PageLayout>
  );
};

export default UsersPage;
