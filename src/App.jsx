import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { canRead } from '@/lib/permissions';
import AccessDenied from '@/lib/AccessDenied';
import { CurrencyProvider } from '@/components/shared/CurrencyContext';
import TimeManagement from './pages/TimeManagement';
import DeliveryModule from './pages/DeliveryModule';
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

const AuthenticatedApp = () => {
  const { isAuthenticated, isLoadingAuth } = useAuth();
  const location = useLocation();
  const publicPath = location.pathname.toLowerCase();

  if (publicPath === '/reset-password') {
    return <ResetPassword />;
  }

  if (isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login />;
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
