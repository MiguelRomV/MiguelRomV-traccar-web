import { useEffect, useState } from 'react';
import { IconButton, Paper, Tooltip } from '@mui/material';
import { makeStyles } from 'tss-react/mui';
import { useNavigate } from 'react-router-dom';
import PrintOutlinedIcon from '@mui/icons-material/PrintOutlined';
import FullscreenOutlinedIcon from '@mui/icons-material/FullscreenOutlined';
import PolylineOutlinedIcon from '@mui/icons-material/PolylineOutlined';
import RouteOutlinedIcon from '@mui/icons-material/RouteOutlined';
import LabelOutlinedIcon from '@mui/icons-material/LabelOutlined';
import TrafficOutlinedIcon from '@mui/icons-material/TrafficOutlined';
import { map } from '../core/MapView';
import { useTranslation } from '../../common/components/LocalizationProvider';

const useStyles = makeStyles()((theme) => ({
  root: {
    position: 'fixed',
    top: theme.spacing(11),
    right: theme.spacing(1.25),
    zIndex: 2,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  button: { borderRadius: 0, color: '#4B5563' },
  active: { color: theme.palette.primary.main, backgroundColor: '#E6F0FA' },
}));

const trafficLayer = (layer) => {
  const value = `${layer.id} ${layer.metadata?.['traccar:title'] || ''}`.toLowerCase();
  return value.includes('traffic') || value.includes('tráfico') || value.includes('trafico');
};

const MapActionToolbar = ({ routesVisible, setRoutesVisible, labelsVisible, setLabelsVisible }) => {
  const { classes } = useStyles();
  const t = useTranslation();
  const navigate = useNavigate();
  const [trafficVisible, setTrafficVisible] = useState(true);

  useEffect(() => {
    const apply = () => {
      map
        .getStyle()
        ?.layers?.filter(trafficLayer)
        .forEach((layer) => {
          const visibility = trafficVisible ? 'visible' : 'none';
          if ((map.getLayoutProperty(layer.id, 'visibility') || 'visible') !== visibility) {
            map.setLayoutProperty(layer.id, 'visibility', visibility);
          }
        });
    };
    map.on('styledata', apply);
    apply();
    return () => map.off('styledata', apply);
  }, [trafficVisible]);

  const fullscreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      map.getContainer().requestFullscreen();
    }
  };

  const items = [
    { title: t('sharedPrint'), Icon: PrintOutlinedIcon, action: () => window.print() },
    { title: t('mapFullscreen'), Icon: FullscreenOutlinedIcon, action: fullscreen },
    {
      title: t('sharedGeofence'),
      Icon: PolylineOutlinedIcon,
      action: () => navigate('/settings/geofence'),
    },
    {
      title: t('mapGoogleTraffic'),
      Icon: TrafficOutlinedIcon,
      action: () => setTrafficVisible((value) => !value),
      active: trafficVisible,
    },
    {
      title: t('mapLiveRoutes'),
      Icon: RouteOutlinedIcon,
      action: () => setRoutesVisible((value) => !value),
      active: routesVisible,
    },
    {
      title: t('mapDeviceLabels'),
      Icon: LabelOutlinedIcon,
      action: () => setLabelsVisible((value) => !value),
      active: labelsVisible,
    },
  ];

  return (
    <Paper className={classes.root} elevation={3}>
      {items.map(({ title, Icon, action, active }, index) => (
        <Tooltip key={title} title={title} placement="left">
          <IconButton
            className={`${classes.button} ${index > 2 && active ? classes.active : ''}`}
            onClick={action}
          >
            <Icon />
          </IconButton>
        </Tooltip>
      ))}
    </Paper>
  );
};

export default MapActionToolbar;
