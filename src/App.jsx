import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { pagesConfig } from './pages.config'
import { useEffect, useRef } from 'react';
import { BrowserRouter as Router, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { canRead } from '@/lib/permissions';
import AccessDenied from '@/lib/AccessDenied';
import { CurrencyProvider } from '@/components/shared/CurrencyContext';
import TimeManagement from './pages/TimeManagement';
import DeliveryModule from './pages/DeliveryModule';
import ProjectDetail from './pages/ProjectDetail';
import WorkSectionDetail from './pages/WorkSectionDetail';
import Login from './pages/Login';
import ResetPassword from './pages/ResetPassword';
import ErrorBoundary from '@/lib/ErrorBoundary';
import GlobalErrorHandlers from '@/lib/GlobalErrorHandlers';

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

// Block direct navigation to a page the current role can't read.
const Guarded = ({ page, children }) => {
  const { userRole } = useAuth();
  return canRead(userRole, page) ? children : <AccessDenied />;
};

const Spinner = () => (
  <div className="fixed inset-0 flex items-center justify-center">
    <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
  </div>
);

const AuthenticatedApp = () => {
  const { isAuthenticated, isLoadingAuth, isLoadingRole } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const publicPath = location.pathname.toLowerCase();

  // Land on the main page after signing in, rather than resuming whatever route
  // the URL happened to hold (a deep link, or wherever a session expired).
  //
  // Restoring a session on page load also flips isAuthenticated false -> true,
  // and that must NOT redirect — refreshing on a page should keep you there.
  // The two are told apart by whether auth had already finished initialising:
  // on load the flip happens as isLoadingAuth clears, on sign-in it happens
  // well after.
  const authInitialised = useRef(false);
  const wasAuthenticated = useRef(false);
  useEffect(() => {
    if (isLoadingAuth) return;
    if (authInitialised.current && !wasAuthenticated.current && isAuthenticated) {
      navigate('/', { replace: true });
    }
    authInitialised.current = true;
    wasAuthenticated.current = isAuthenticated;
  }, [isAuthenticated, isLoadingAuth, navigate]);

  if (publicPath === '/reset-password') {
    return <ResetPassword />;
  }

  if (isLoadingAuth) {
    return <Spinner />;
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  // Signed in, but the role lookup is still in flight. Rendering now would let
  // the route guards read a null role and flash "Access Denied" before the real
  // page appears.
  if (isLoadingRole) {
    return <Spinner />;
  }

  return (
    <Routes>
      <Route path="/" element={
        <LayoutWrapper currentPageName={mainPageKey}>
          <Guarded page={mainPageKey}><MainPage /></Guarded>
        </LayoutWrapper>
      } />
      {Object.entries(Pages).map(([path, Page]) => (
        <Route
          key={path}
          path={`/${path}`}
          element={
            <LayoutWrapper currentPageName={path}>
              <Guarded page={path}><Page /></Guarded>
            </LayoutWrapper>
          }
        />
      ))}
      {/* Project detail lives on its own route so a project can be linked to and
          reloaded, which an inline expander cannot do. */}
      <Route path="/Projects/:projectId" element={<LayoutWrapper currentPageName="Projects"><Guarded page="Projects"><ProjectDetail /></Guarded></LayoutWrapper>} />
      <Route path="/WorkSections/:sectionId" element={<LayoutWrapper currentPageName="WorkSections"><Guarded page="WorkSections"><WorkSectionDetail /></Guarded></LayoutWrapper>} />
      <Route path="/TimeManagement" element={<LayoutWrapper currentPageName="TimeManagement"><Guarded page="TimeManagement"><TimeManagement /></Guarded></LayoutWrapper>} />
      <Route path="/DeliveryModule" element={<LayoutWrapper currentPageName="DeliveryModule"><Guarded page="DeliveryModule"><DeliveryModule /></Guarded></LayoutWrapper>} />
      <Route path="/login" element={<Login />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <CurrencyProvider>
          <QueryClientProvider client={queryClientInstance}>
            <GlobalErrorHandlers />
            <Router basename={import.meta.env.BASE_URL}>
              <AuthenticatedApp />
            </Router>
            <Toaster />
          </QueryClientProvider>
        </CurrencyProvider>
      </AuthProvider>
    </ErrorBoundary>
  )
}

export default App
