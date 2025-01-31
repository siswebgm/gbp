import { Navigate } from 'react-router-dom';
import { Login } from '../pages/Login';

export const publicRoutes = [
  {
    path: '/',
    element: <Login />,
  },
];