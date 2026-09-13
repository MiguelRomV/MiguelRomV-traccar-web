import { useEffect, useMemo, useState } from 'react';
import { IconButton, Paper, Typography } from '@mui/material';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { makeStyles } from 'tss-react/mui';

const useStyles = makeStyles()((theme) => ({
  root: {
    position: 'fixed',
    right: theme.spacing(2),
    bottom: 322,
    zIndex: 3,
    width: 280,
    overflow: 'hidden',
    borderRadius: 8,
    boxShadow: theme.shadows[4],
    pointerEvents: 'auto',
    [theme.breakpoints.down('md')]: {
      right: theme.spacing(1),
      bottom: `calc(${theme.dimensions.bottomBarHeight}px + ${theme.spacing(1)})`,
      width: 220,
    },
  },
  header: {
    height: 36,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: theme.spacing(1.5),
    backgroundColor: theme.palette.background.paper,
  },
  frame: {
    display: 'block',
    width: '100%',
    height: 200,
    border: 0,
  },
}));

const StreetViewMini = ({ position }) => {
  const { classes } = useStyles();
  const [expanded, setExpanded] = useState(true);
  const [debouncedPosition, setDebouncedPosition] = useState(position);

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedPosition(position), 2000);
    return () => clearTimeout(timeout);
  }, [position]);

  const source = useMemo(() => {
    if (!debouncedPosition?.latitude || !debouncedPosition?.longitude) {
      return null;
    }
    const latitude = encodeURIComponent(debouncedPosition.latitude);
    const longitude = encodeURIComponent(debouncedPosition.longitude);
    const heading = encodeURIComponent(debouncedPosition.course || 0);
    const googleMapsKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    if (googleMapsKey) {
      return `https://www.google.com/maps/embed/v1/streetview?key=${encodeURIComponent(googleMapsKey)}&location=${latitude},${longitude}&heading=${heading}&pitch=0&fov=80`;
    }
    return `https://www.google.com/maps?q=${latitude},${longitude}&t=k&z=18&output=embed`;
  }, [debouncedPosition]);

  if (!source) {
    return null;
  }

  return (
    <Paper className={classes.root} elevation={4}>
      <div className={classes.header}>
        <Typography variant="caption" fontWeight={600}>
          Street View
        </Typography>
        <IconButton
          size="small"
          aria-label={expanded ? 'Contraer Street View' : 'Expandir Street View'}
          onClick={() => setExpanded((value) => !value)}
        >
          {expanded ? <ExpandMoreIcon fontSize="small" /> : <ExpandLessIcon fontSize="small" />}
        </IconButton>
      </div>
      {expanded && (
        <iframe
          className={classes.frame}
          title="Street View"
          src={source}
          loading="lazy"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
        />
      )}
    </Paper>
  );
};

export default StreetViewMini;
