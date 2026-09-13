import { useDispatch, useSelector } from 'react-redux';
import { makeStyles } from 'tss-react/mui';
import { Checkbox, ListItemButton, Tooltip, Typography } from '@mui/material';
import SatelliteAltOutlinedIcon from '@mui/icons-material/SatelliteAltOutlined';
import SignalCellularAltIcon from '@mui/icons-material/SignalCellularAlt';
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';
import dayjs from 'dayjs';
import { devicesActions } from '../store';
import { formatAlarm, formatSpeed } from '../common/util/formatter';
import { useTranslation } from '../common/components/LocalizationProvider';
import { mapIconKey, mapIcons } from '../map/core/preloadImages';
import { useAdministrator } from '../common/util/permissions';
import { useAttributePreference } from '../common/util/preferences';
import { isJammerActive } from '../common/util/jammer';

const categoryColors = {
  car: '#E53935',
  truck: '#0A76C4',
  motorcycle: '#1A1A1A',
  bus: '#2ECC71',
  person: '#8A8F98',
};

const useStyles = makeStyles()((theme) => ({
  row: {
    minHeight: 64,
    padding: theme.spacing(1, 1.25),
    borderBottom: `1px solid ${theme.palette.divider}`,
    '&:hover': { backgroundColor: '#F5F6F8' },
    '&.Mui-selected': {
      backgroundColor: '#E6F0FA',
      '&:hover': { backgroundColor: '#DCEAF7' },
    },
  },
  checkbox: { padding: theme.spacing(0.5), marginRight: theme.spacing(0.75) },
  vehicleIcon: {
    width: 28,
    height: 28,
    flexShrink: 0,
    marginRight: theme.spacing(1),
    backgroundColor: 'var(--vehicle-color)',
    maskImage: 'var(--vehicle-icon)',
    maskRepeat: 'no-repeat',
    maskPosition: 'center',
    maskSize: 'contain',
  },
  identity: { minWidth: 0, flex: 1 },
  name: {
    color: theme.palette.text.primary,
    fontSize: 14,
    fontWeight: 600,
    lineHeight: 1.25,
  },
  timestamp: { color: '#8A8F98', fontSize: 10.5, lineHeight: 1.4 },
  telemetry: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(0.5),
    marginLeft: theme.spacing(1),
  },
  signal: { color: '#10B981', fontSize: 17 },
  noSignal: { color: '#B8BDC5', fontSize: 17 },
  alarm: { color: theme.palette.error.main, fontSize: 17 },
  speed: {
    minWidth: 66,
    color: '#10B981',
    fontSize: 13,
    fontWeight: 700,
    textAlign: 'right',
  },
  stopped: { color: '#8A8F98' },
}));

const DeviceRow = ({ devices, index, device, style }) => {
  const { classes } = useStyles();
  const dispatch = useDispatch();
  const t = useTranslation();
  const admin = useAdministrator();
  const speedUnit = useAttributePreference('speedUnit', 'kmh');
  const selectedDeviceId = useSelector((state) => state.devices.selectedId);

  const item = device || devices[index];
  const position = useSelector((state) => state.session.positions[item.id]);
  const selected = selectedDeviceId === item.id;
  const connected = item.status === 'online' && Boolean(position);
  const moving = (position?.speed || 0) > 0;
  const category = mapIconKey(item.category);
  const color = categoryColors[category] || '#8A8F98';
  const jammerActive = isJammerActive(position);

  const select = () => dispatch(devicesActions.selectId(item.id));

  return (
    <div style={style}>
      <ListItemButton
        className={classes.row}
        onClick={select}
        disabled={!admin && item.disabled}
        selected={selected}
      >
        <Checkbox
          className={classes.checkbox}
          size="small"
          checked={selected}
          onClick={(event) => event.stopPropagation()}
          onChange={select}
          inputProps={{ 'aria-label': item.name }}
        />
        <span
          className={classes.vehicleIcon}
          style={{ '--vehicle-color': color, '--vehicle-icon': `url(${mapIcons[category]})` }}
        />
        <div className={classes.identity}>
          <Typography noWrap className={classes.name}>
            {item.name}
          </Typography>
          <Typography noWrap className={classes.timestamp}>
            {item.lastUpdate
              ? dayjs(item.lastUpdate).format('YYYY-MM-DD HH:mm:ss')
              : t('sharedNoData')}
          </Typography>
        </div>
        <div className={classes.telemetry}>
          {jammerActive && (
            <Tooltip title={t('sharedJammerDetected')}>
              <span role="img" aria-label={t('sharedJammerDetected')}>
                🚫📡
              </span>
            </Tooltip>
          )}
          {position?.attributes?.alarm && (
            <Tooltip title={formatAlarm(position.attributes.alarm, t)}>
              <WarningAmberOutlinedIcon className={classes.alarm} />
            </Tooltip>
          )}
          <SatelliteAltOutlinedIcon className={connected ? classes.signal : classes.noSignal} />
          <SignalCellularAltIcon className={connected ? classes.signal : classes.noSignal} />
          <Typography className={`${classes.speed} ${moving ? '' : classes.stopped}`}>
            {position ? formatSpeed(position.speed || 0, speedUnit, t) : '—'}
          </Typography>
        </div>
      </ListItemButton>
    </div>
  );
};

export default DeviceRow;
