import reactDom from 'react-dom/client';
import {
  createBrowserRouter,
  RouterProvider,
  Navigate,
} from 'react-router-dom';
import { App } from './App.tsx';
import { Docs } from './Docs.tsx';
import { NonexistingRoute } from './components/NonexistingRoute';
import './index.css';
import './auth/axiosInterceptors.ts';

import { AuthProvider, useAuth } from 'react-oidc-context';
import { oidcConfig } from './auth/config.ts';
import { FC } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const router = createBrowserRouter([
  // There is issue with path "/app". Don't use to avoid
  {
    path: '/',
    element: <Navigate to="/grid-map/connections" replace={true} />,
  },
  {
    path: '/grid-map/:tab',
    element: <App />,
  },
  {
    path: '/documentation',
    element: <Docs />,
  },
  {
    path: '*',
    element: <NonexistingRoute />,
  },
]);

const AppContainer: FC = () => {
  const auth = useAuth();

  if (auth.isLoading) {
    return <div>Signing you in/out...</div>;
  }

  return <RouterProvider router={router} />;
};

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    },
  },
});

reactDom.createRoot(document.getElementById('root') as HTMLElement).render(
  <AuthProvider {...oidcConfig}>
    <QueryClientProvider client={queryClient}>
      <AppContainer />
    </QueryClientProvider>
  </AuthProvider>
);
