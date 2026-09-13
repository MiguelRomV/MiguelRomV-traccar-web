import { Button, Container, Paper, Typography } from "@mui/material";
import { makeStyles } from "tss-react/mui";
import { useNavigate } from "react-router-dom";
import SendOutlinedIcon from "@mui/icons-material/SendOutlined";
import { useTranslation } from "../common/components/LocalizationProvider";

const useStyles = makeStyles()((theme) => ({
  root: { paddingTop: theme.spacing(5) },
  card: {
    maxWidth: 620,
    margin: "0 auto",
    padding: theme.spacing(4),
    textAlign: "center",
  },
  icon: {
    fontSize: 48,
    color: theme.palette.primary.main,
    marginBottom: theme.spacing(2),
  },
  text: { margin: theme.spacing(1, 0, 3), color: theme.palette.text.secondary },
}));

const CommandsPage = () => {
  const { classes } = useStyles();
  const t = useTranslation();
  const navigate = useNavigate();
  return (
    <Container className={classes.root}>
      <Paper className={classes.card}>
        <SendOutlinedIcon className={classes.icon} />
        <Typography variant="h5">{t("navigationCommands")}</Typography>
        <Typography className={classes.text}>
          {t("navigationCommandsDescription")}
        </Typography>
        <Button
          variant="contained"
          onClick={() => navigate("/settings/commands")}
        >
          {t("sharedSavedCommands")}
        </Button>
      </Paper>
    </Container>
  );
};

export default CommandsPage;
