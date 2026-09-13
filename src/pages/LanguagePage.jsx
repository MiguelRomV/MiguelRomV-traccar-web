import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  Button,
  Container,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Typography,
} from "@mui/material";
import { makeStyles } from "tss-react/mui";
import {
  useLocalization,
  useTranslation,
} from "../common/components/LocalizationProvider";
import { sessionActions } from "../store";
import fetchOrThrow from "../common/util/fetchOrThrow";

const useStyles = makeStyles()((theme) => ({
  root: { paddingTop: theme.spacing(5) },
  card: { maxWidth: 620, margin: "0 auto", padding: theme.spacing(4) },
  title: { marginBottom: theme.spacing(3) },
  select: { marginBottom: theme.spacing(3) },
}));

const LanguagePage = () => {
  const { classes } = useStyles();
  const t = useTranslation();
  const dispatch = useDispatch();
  const user = useSelector((state) => state.session.user);
  const { languages, language, setLocalLanguage } = useLocalization();
  const [selectedLanguage, setSelectedLanguage] = useState(language);

  const save = async () => {
    setLocalLanguage(selectedLanguage);
    if (user && !user.readonly) {
      const updated = {
        ...user,
        attributes: { ...user.attributes, language: selectedLanguage },
      };
      const response = await fetchOrThrow(`/api/users/${user.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated),
      });
      dispatch(sessionActions.updateUser(await response.json()));
    }
  };

  return (
    <Container className={classes.root}>
      <Paper className={classes.card}>
        <Typography variant="h5" className={classes.title}>
          {t("navigationLanguage")}
        </Typography>
        <FormControl fullWidth className={classes.select}>
          <InputLabel>{t("navigationLanguage")}</InputLabel>
          <Select
            label={t("navigationLanguage")}
            value={selectedLanguage}
            onChange={(event) => setSelectedLanguage(event.target.value)}
          >
            {Object.entries(languages).map(([code, item]) => (
              <MenuItem key={code} value={code}>
                {item.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <Button variant="contained" onClick={save}>
          {t("sharedSave")}
        </Button>
      </Paper>
    </Container>
  );
};

export default LanguagePage;
