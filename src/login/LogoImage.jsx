import { useTheme, useMediaQuery } from '@mui/material';
import { useSelector } from 'react-redux';
import { makeStyles } from 'tss-react/mui';
import LogoFallback from '../resources/images/logo.svg?react';
import LogoVigilateh from '../resources/images/logo-vigilateh.png';

const useStyles = makeStyles()((theme) => ({
  image: {
    alignSelf: 'center',
    maxWidth: '200px',
    maxHeight: '260px',
    width: 'auto',
    height: 'auto',
    margin: theme.spacing(2),
    [theme.breakpoints.down('lg')]: {
      maxWidth: '160px',
      maxHeight: '200px',
    },
  },
}));

const LogoImage = ({ color }) => {
  const theme = useTheme();
  const { classes } = useStyles();

  const expanded = !useMediaQuery(theme.breakpoints.down('lg'));

  const logo = useSelector((state) => state.session.server.attributes?.logo);
  const logoInverted = useSelector((state) => state.session.server.attributes?.logoInverted);

  if (logo) {
    if (expanded && logoInverted) {
      return <img className={classes.image} src={logoInverted} alt="" />;
    }
    return <img className={classes.image} src={logo} alt="" />;
  }
  if (LogoVigilateh) {
    return <img className={classes.image} src={LogoVigilateh} alt="VigilaTeh" />;
  }
  return <LogoFallback className={classes.image} style={{ color }} />;
};

export default LogoImage;
