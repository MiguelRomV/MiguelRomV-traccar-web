import { useDispatch, useSelector } from 'react-redux';
import { useLocation, useNavigate } from 'react-router-dom';
import { BottomNavigation, BottomNavigationAction, Paper } from '@mui/material';
import LogoutOutlinedIcon from '@mui/icons-material/LogoutOutlined';
import { useTranslation } from './LocalizationProvider';
import { logout, navigationItems } from './SideNav';

const BottomMenu = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const t = useTranslation();
  const user = useSelector((state) => state.session.user);
  const current = navigationItems.find((item) =>
    item.href === '/' ? location.pathname === '/' : location.pathname.startsWith(item.href),
  )?.value;
  return (
    <Paper square elevation={3}>
      <BottomNavigation
        value={current || false}
        showLabels
        sx={{
          overflowX: 'auto',
          justifyContent: 'flex-start',
          '& .MuiBottomNavigationAction-root': { minWidth: 72, flex: '0 0 72px' },
        }}
      >
        {navigationItems.map((item) => {
          const Icon = item.icon;
          return (
            <BottomNavigationAction
              key={item.value}
              value={item.value}
              label={t(item.label)}
              icon={<Icon />}
              onClick={() => navigate(item.href)}
            />
          );
        })}
        <BottomNavigationAction
          value="logout"
          label={t('loginLogout')}
          icon={<LogoutOutlinedIcon />}
          onClick={() => logout(user, dispatch, navigate)}
        />
      </BottomNavigation>
    </Paper>
  );
};

export default BottomMenu;
