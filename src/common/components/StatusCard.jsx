import { useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  Button,
  IconButton,
  Link,
  Menu,
  MenuItem,
  Paper,
  Tab,
  Tabs,
  Tooltip,
  Typography,
} from '@mui/material';
import { makeStyles } from 'tss-react/mui';
import CloseIcon from '@mui/icons-material/Close';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import RouteIcon from '@mui/icons-material/Route';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import PowerSettingsNewIcon from '@mui/icons-material/PowerSettingsNew';
import SpeedIcon from '@mui/icons-material/Speed';
import RouteOutlinedIcon from '@mui/icons-material/RouteOutlined';
import TerrainOutlinedIcon from '@mui/icons-material/TerrainOutlined';
import ScheduleOutlinedIcon from '@mui/icons-material/ScheduleOutlined';
import UpdateOutlinedIcon from '@mui/icons-material/UpdateOutlined';
import ExploreOutlinedIcon from '@mui/icons-material/ExploreOutlined';
import LocationOnOutlinedIcon from '@mui/icons-material/LocationOnOutlined';
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';
import BatteryChargingFullOutlinedIcon from '@mui/icons-material/BatteryChargingFullOutlined';
import BatteryStdOutlinedIcon from '@mui/icons-material/BatteryStdOutlined';
import SignalCellularAltIcon from '@mui/icons-material/SignalCellularAlt';
import KeyOutlinedIcon from '@mui/icons-material/KeyOutlined';
import SatelliteAltOutlinedIcon from '@mui/icons-material/SatelliteAltOutlined';
import ThermostatOutlinedIcon from '@mui/icons-material/ThermostatOutlined';
import LocalGasStationOutlinedIcon from '@mui/icons-material/LocalGasStationOutlined';

import { useTranslation } from './LocalizationProvider';
import PositionValue from './PositionValue';
import RemoveDialog from './RemoveDialog';
import BaseCommandView from '../../settings/components/BaseCommandView';
import { useDeviceReadonly, useRestriction } from '../util/permissions';
import { devicesActions } from '../../store';
import { useCatch, useCatchCallback } from '../../reactHelper';
import { useAttributePreference } from '../util/preferences';
import { speedFromKnots, speedUnitString } from '../util/converter';
import fetchOrThrow from '../util/fetchOrThrow';

const useStyles = makeStyles()((theme, { desktopPadding }) => ({
  root: {
    position: 'fixed',
    zIndex: 5,
    left: desktopPadding,
    right: 0,
    bottom: 0,
    pointerEvents: 'auto',
    [theme.breakpoints.down('md')]: {
      left: 0,
      bottom: theme.dimensions.bottomBarHeight,
    },
  },
  panel: {
    borderRadius: '8px 8px 0 0',
    boxShadow: theme.shadows[8],
    overflow: 'hidden',
  },
  header: {
    minHeight: 42,
    display: 'flex',
    alignItems: 'center',
    padding: theme.spacing(0.5, 1, 0.5, 2),
    borderBottom: `1px solid ${theme.palette.divider}`,
  },
  title: {
    flex: 1,
    fontSize: 14,
    fontWeight: 600,
  },
  tabs: {
    minHeight: 38,
    borderBottom: `1px solid ${theme.palette.divider}`,
    '& .MuiTab-root': {
      minHeight: 38,
      paddingTop: 0,
      paddingBottom: 0,
      fontSize: 13,
    },
  },
  body: {
    display: 'grid',
    gridTemplateColumns: 'minmax(420px, 1fr) 180px minmax(240px, 300px)',
    gap: theme.spacing(2),
    padding: theme.spacing(1.5, 2),
    maxHeight: 260,
    overflowY: 'auto',
    backgroundColor: theme.palette.background.paper,
    [theme.breakpoints.down('lg')]: {
      gridTemplateColumns: '1fr 160px',
    },
    [theme.breakpoints.down('md')]: {
      gridTemplateColumns: '1fr',
      maxHeight: '45vh',
    },
  },
  metrics: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(190px, 1fr))',
    gap: theme.spacing(0.75, 1.5),
    [theme.breakpoints.down('sm')]: { gridTemplateColumns: '1fr' },
  },
  metric: {
    minHeight: 34,
    display: 'grid',
    gridTemplateColumns: '20px minmax(82px, auto) 1fr',
    alignItems: 'center',
    gap: theme.spacing(0.75),
    padding: theme.spacing(0.5, 1),
    borderRadius: 6,
    backgroundColor: theme.palette.mode === 'dark' ? theme.palette.background.default : '#F5F6F8',
  },
  metricIcon: { color: '#8A8F98', fontSize: 17 },
  metricLabel: { color: '#8A8F98', fontSize: 11 },
  metricValue: {
    minWidth: 0,
    color: theme.palette.text.primary,
    fontSize: 13,
    textAlign: 'right',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  statusMoving: { color: '#10B981', fontWeight: 600 },
  statusStopped: { color: theme.palette.text.secondary },
  statusOffline: { color: theme.palette.error.main, fontWeight: 600 },
  gauge: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderLeft: `1px solid ${theme.palette.divider}`,
    borderRight: `1px solid ${theme.palette.divider}`,
    [theme.breakpoints.down('md')]: { border: 0 },
  },
  gaugeSvg: { width: 132, height: 112 },
  gaugeValue: { fontSize: 24, fontWeight: 700 },
  gaugeUnit: { fill: '#8A8F98', fontSize: 11 },
  commands: {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(1),
    [theme.breakpoints.between('md', 'lg')]: { display: 'none' },
  },
  empty: {
    gridColumn: '1 / -1',
    minHeight: 120,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: theme.palette.text.secondary,
  },
}));

const Metric = ({ icon: Icon, label, children, className }) => {
  const { classes } = useStyles({ desktopPadding: 0 });
  return (
    <div className={classes.metric}>
      <Icon className={classes.metricIcon} />
      <span className={classes.metricLabel}>{label}</span>
      <span className={`${classes.metricValue} ${className || ''}`}>{children}</span>
    </div>
  );
};

const SpeedGauge = ({ speed, unit, t }) => {
  const { classes } = useStyles({ desktopPadding: 0 });
  const displaySpeed = speedFromKnots(speed || 0, unit);
  const progress = Math.min(speedFromKnots(speed || 0, 'kmh') / 120, 1);
  const arcLength = 212;

  return (
    <div className={classes.gauge}>
      <svg className={classes.gaugeSvg} viewBox="0 0 120 105" aria-label={t('positionSpeed')}>
        <circle
          cx="60"
          cy="58"
          r="45"
          fill="none"
          stroke="#E0E3E8"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={`${arcLength} 283`}
          transform="rotate(135 60 58)"
        />
        <circle
          cx="60"
          cy="58"
          r="45"
          fill="none"
          stroke="#10B981"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={`${progress * arcLength} 283`}
          transform="rotate(135 60 58)"
          style={{ transition: 'stroke-dasharray 300ms ease' }}
        />
        <text x="60" y="59" textAnchor="middle" className={classes.gaugeValue}>
          {Math.round(displaySpeed)}
        </text>
        <text x="60" y="78" textAnchor="middle" className={classes.gaugeUnit}>
          {speedUnitString(unit, t)}
        </text>
      </svg>
    </div>
  );
};

const StatusCard = ({ deviceId, position, onClose, disableActions, desktopPadding = 0 }) => {
  const { classes } = useStyles({ desktopPadding });
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const t = useTranslation();

  const readonly = useRestriction('readonly');
  const deviceReadonly = useDeviceReadonly();
  const speedUnit = useAttributePreference('speedUnit', 'kmh');
  const navigationAppLink = useAttributePreference('navigationAppLink');
  const navigationAppTitle = useAttributePreference('navigationAppTitle');

  const shareDisabled = useSelector((state) => state.session.server.attributes.disableShare);
  const user = useSelector((state) => state.session.user);
  const device = useSelector((state) => state.devices.items[deviceId]);

  const [collapsed, setCollapsed] = useState(false);
  const [tab, setTab] = useState(0);
  const [anchorEl, setAnchorEl] = useState(null);
  const [removing, setRemoving] = useState(false);
  const [savedId, setSavedId] = useState(0);
  const [command, setCommand] = useState({});

  const speedKmh = speedFromKnots(position?.speed || 0, 'kmh');
  const status = useMemo(() => {
    const lastUpdate = Date.parse(device?.lastUpdate);
    const stale = device?.status !== 'online' || !lastUpdate || Date.now() - lastUpdate > 300000;
    if (stale) return { label: t('positionStateNoSignal'), className: classes.statusOffline };
    if (speedKmh > 5) return { label: t('positionStateMoving'), className: classes.statusMoving };
    if (position?.attributes?.ignition === true) {
      return {
        label: position.attributes.motion === false ? t('positionStateIdle') : t('positionStateOn'),
        className: classes.statusStopped,
      };
    }
    return { label: t('positionStateOff'), className: classes.statusStopped };
  }, [classes, device, position, speedKmh, t]);

  const has = (key, property = false) =>
    property ? position?.[key] != null : position?.attributes?.[key] != null;
  const value = (key, property = false) => (
    <PositionValue
      position={position}
      property={property ? key : null}
      attribute={property ? null : key}
    />
  );

  const metrics = [
    {
      key: 'status',
      icon: PowerSettingsNewIcon,
      label: t('positionStatus'),
      custom: status.label,
      className: status.className,
      always: true,
    },
    {
      key: has('odometer') ? 'odometer' : 'totalDistance',
      icon: RouteOutlinedIcon,
      label: t('positionOdometer'),
    },
    { key: 'altitude', property: true, icon: TerrainOutlinedIcon, label: t('positionAltitude') },
    { key: 'fixTime', property: true, icon: ScheduleOutlinedIcon, label: t('positionFixTime') },
    { key: 'serverTime', property: true, icon: UpdateOutlinedIcon, label: t('positionServerTime') },
    { key: 'course', property: true, icon: ExploreOutlinedIcon, label: t('positionCourse') },
    {
      key: 'coordinates',
      icon: LocationOnOutlinedIcon,
      label: t('positionCoordinates'),
      always: true,
    },
    { key: 'speed', property: true, icon: SpeedIcon, label: t('positionSpeed') },
    { key: 'alarm', icon: WarningAmberOutlinedIcon, label: t('positionAlarm') },
    {
      key: has('power') ? 'power' : 'battery',
      icon: BatteryChargingFullOutlinedIcon,
      label: t('positionExternalBattery'),
    },
    { key: 'batteryLevel', icon: BatteryStdOutlinedIcon, label: t('positionInternalBattery') },
    { key: 'rssi', icon: SignalCellularAltIcon, label: t('positionGsm') },
    { key: 'ignition', icon: KeyOutlinedIcon, label: t('positionIgnition') },
    { key: 'sat', icon: SatelliteAltOutlinedIcon, label: t('positionSat') },
    {
      key: has('coolantTemp') ? 'coolantTemp' : 'engineTemp',
      icon: ThermostatOutlinedIcon,
      label: t('positionTemperature'),
    },
    { key: 'fuel', icon: LocalGasStationOutlinedIcon, label: t('positionFuel') },
  ].filter((metric) => metric.always || has(metric.key, metric.property));

  const handleRemove = useCatch(async (removed) => {
    if (removed) {
      const response = await fetchOrThrow('/api/devices');
      dispatch(devicesActions.refresh(await response.json()));
    }
    setRemoving(false);
  });

  const handleGeofence = useCatchCallback(async () => {
    const newItem = {
      name: t('sharedGeofence'),
      area: `CIRCLE (${position.latitude} ${position.longitude}, 50)`,
    };
    const response = await fetchOrThrow('/api/geofences', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newItem),
    });
    const item = await response.json();
    await fetchOrThrow('/api/permissions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId: position.deviceId, geofenceId: item.id }),
    });
    navigate(`/settings/geofence/${item.id}`);
  }, [navigate, position, t]);

  const handleSend = useCatch(async () => {
    let payload = command;
    if (savedId) {
      const response = await fetchOrThrow(`/api/commands/${savedId}`);
      payload = await response.json();
    }
    await fetchOrThrow('/api/commands/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, deviceId: Number(deviceId) }),
    });
    setSavedId(0);
    setCommand({});
  });

  if (!device) return null;

  return (
    <>
      <div className={classes.root}>
        <Paper className={classes.panel}>
          <div className={classes.header}>
            <Typography className={classes.title}>{device.name}</Typography>
            <Tooltip title={t('reportReplay')}>
              <IconButton
                size="small"
                onClick={() => navigate(`/replay?deviceId=${deviceId}`)}
                disabled={!position}
              >
                <RouteIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title={t('sharedEdit')}>
              <IconButton
                size="small"
                onClick={() => navigate(`/settings/device/${deviceId}`)}
                disabled={disableActions || deviceReadonly}
              >
                <EditIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <IconButton
              size="small"
              onClick={(event) => setAnchorEl(event.currentTarget)}
              disabled={!position}
            >
              <MoreHorizIcon fontSize="small" />
            </IconButton>
            <IconButton size="small" onClick={() => setCollapsed((current) => !current)}>
              {collapsed ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </IconButton>
            <IconButton size="small" onClick={onClose} onTouchStart={onClose}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </div>
          {!collapsed && (
            <>
              <Tabs value={tab} onChange={(_, nextTab) => setTab(nextTab)} className={classes.tabs}>
                <Tab label={t('statusPanelData')} />
                <Tab label={t('reportChart')} />
                <Tab label={t('statusPanelMessages')} />
              </Tabs>
              <div className={classes.body}>
                {tab === 0 && position && (
                  <>
                    <div className={classes.metrics}>
                      {metrics.map((metric) => (
                        <Metric
                          key={metric.key}
                          icon={metric.icon}
                          label={metric.label}
                          className={metric.className}
                        >
                          {metric.key === 'coordinates' ? (
                            <Link
                              href={`https://www.google.com/maps/search/?api=1&query=${position.latitude},${position.longitude}`}
                              target="_blank"
                              rel="noopener"
                            >
                              {position.latitude.toFixed(6)}°, {position.longitude.toFixed(6)}°
                            </Link>
                          ) : metric.custom != null ? (
                            metric.custom
                          ) : (
                            value(metric.key, metric.property)
                          )}
                        </Metric>
                      ))}
                    </div>
                    <SpeedGauge speed={position.speed} unit={speedUnit} t={t} />
                    <div className={classes.commands}>
                      <Typography variant="subtitle2">{t('commandTitle')}</Typography>
                      <BaseCommandView
                        deviceId={deviceId}
                        item={command}
                        setItem={setCommand}
                        includeSaved
                        savedId={savedId}
                        setSavedId={setSavedId}
                      />
                      <Button
                        variant="contained"
                        onClick={handleSend}
                        disabled={disableActions || (!savedId && !command.type)}
                      >
                        {t('commandSend')}
                      </Button>
                    </div>
                  </>
                )}
                {tab === 1 && <div className={classes.empty}>{t('sharedNoData')}</div>}
                {tab === 2 && <div className={classes.empty}>{t('sharedComingSoon')}</div>}
              </div>
            </>
          )}
        </Paper>
      </div>
      {position && (
        <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
          {!readonly && <MenuItem onClick={handleGeofence}>{t('sharedCreateGeofence')}</MenuItem>}
          <MenuItem
            component="a"
            target="_blank"
            rel="noopener"
            href={`https://www.google.com/maps/search/?api=1&query=${position.latitude},${position.longitude}`}
          >
            {t('linkGoogleMaps')}
          </MenuItem>
          <MenuItem
            component="a"
            target="_blank"
            rel="noopener"
            href={`https://maps.apple.com/?ll=${position.latitude},${position.longitude}`}
          >
            {t('linkAppleMaps')}
          </MenuItem>
          {navigationAppTitle && navigationAppLink && (
            <MenuItem
              component="a"
              target="_blank"
              rel="noopener"
              href={navigationAppLink
                .replace('{latitude}', position.latitude)
                .replace('{longitude}', position.longitude)}
            >
              {navigationAppTitle}
            </MenuItem>
          )}
          {!shareDisabled && !user.temporary && (
            <MenuItem onClick={() => navigate(`/settings/device/${deviceId}/share`)}>
              {t('sharedShare')}
            </MenuItem>
          )}
          <MenuItem onClick={() => setRemoving(true)} disabled={disableActions || deviceReadonly}>
            <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
            {t('sharedRemove')}
          </MenuItem>
        </Menu>
      )}
      <RemoveDialog open={removing} endpoint="devices" itemId={deviceId} onResult={handleRemove} />
    </>
  );
};

export default StatusCard;
