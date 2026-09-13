import { Container, Paper, Typography } from '@mui/material';
import { makeStyles } from 'tss-react/mui';
import AccountBalanceWalletOutlinedIcon from '@mui/icons-material/AccountBalanceWalletOutlined';
import { useTranslation } from '../common/components/LocalizationProvider';

const useStyles = makeStyles()((theme) => ({
  root: { paddingTop: theme.spacing(5) },
  card: { maxWidth: 620, margin: '0 auto', padding: theme.spacing(4), textAlign: 'center' },
  icon: { fontSize: 48, color: theme.palette.primary.main, marginBottom: theme.spacing(2) },
  text: { marginTop: theme.spacing(1), color: theme.palette.text.secondary },
}));

const BillingPage = () => {
  const { classes } = useStyles();
  const t = useTranslation();
  return (
    <Container className={classes.root}>
      <Paper className={classes.card}>
        <AccountBalanceWalletOutlinedIcon className={classes.icon} />
        <Typography variant="h5">{t('navigationBilling')}</Typography>
        <Typography className={classes.text}>{t('navigationBillingDescription')}</Typography>
      </Paper>
    </Container>
  );
};

export default BillingPage;
