import { grey } from '@mui/material/colors';

const validatedColor = (color) => (/^#([0-9A-Fa-f]{3}){1,2}$/.test(color) ? color : null);

export default (server, darkMode) => ({
  mode: darkMode ? 'dark' : 'light',
  background: {
    default: darkMode ? grey[900] : grey[50],
  },
  primary: {
    main: '#0A76C4',
    dark: '#064E85',
    light: '#4DA3DA',
    contrastText: '#FFFFFF',
  },
  secondary: {
    main: '#0A192F',
    dark: '#050D18',
    light: '#1F3A5F',
    contrastText: '#FFFFFF',
  },
  neutral: {
    main: grey[500],
  },
  geometry: {
    main: '#0A76C4',
  },
  alwaysDark: {
    main: grey[900],
  },
});
