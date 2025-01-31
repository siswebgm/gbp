import { lazy } from 'react';
import { Dashboard } from '../pages/Dashboard';
import { VoterRoutes, AttendanceRoutes, disparoMidiaRoutes, documentsRoutes } from './modules/index';
import { ElectoralMap } from '../pages/ElectoralMap';
import { Goals } from '../pages/Goals';
import { Reports } from '../pages/Reports';
import { Settings } from '../pages/Settings';
import { Users } from '../pages/Users';
import { PlanosPage } from '../pages/app/Planos';

// Lazy load ElectionResults component
const ElectionResults = lazy(() => import('../pages/ElectionResults'));

interface RouteConfig {
  path: string;
  element: JSX.Element;
}

export const appRoutes: RouteConfig[] = [
  {
    path: 'dashboard',
    element: <Dashboard />,
  },
  ...VoterRoutes,
  ...AttendanceRoutes,
  ...disparoMidiaRoutes,
  ...documentsRoutes,
  {
    path: 'electoral-map',
    element: <ElectoralMap />,
  },
  {
    path: 'election-results',
    element: <ElectionResults />,
  },
  {
    path: 'goals',
    element: <Goals />,
  },
  {
    path: 'reports',
    element: <Reports />,
  },
  {
    path: 'users',
    element: <Users />,
  },
  {
    path: 'settings',
    element: <Settings />,
  },
  {
    path: 'planos',
    element: <PlanosPage />,
  },
];