import React, { createContext, useState, useContext, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { normalizeRole } from '@/lib/permissions';

const AuthContext = createContext();
const AUTH_INIT_TIMEOUT_MS = 4000;

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [userRole, setUserRole] = useState(null);

  const fetchUserRole = async (userId, email) => {
    try {
      // Primary source of truth: the employee's app_role (System Role).
      const { data: emp } = await supabase
        .from('employees')
        .select('app_role')
        .or(`user_id.eq.${userId}${email ? `,email.eq.${email}` : ''}`)
        .limit(1);
      const empRole = normalizeRole(emp?.[0]?.app_role);
      if (empRole) { setUserRole(empRole); return; }

      // Fallback: legacy roles/user_roles mapping (keeps the original admin working).
      const { data } = await supabase
        .from('user_roles')
        .select(`roles ( name )`)
        .eq('user_id', userId);
      setUserRole(normalizeRole(data?.[0]?.roles?.name) || null);
    } catch (error) {
      console.error('Error fetching user role:', error);
      setUserRole(null);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const applySession = (session) => {
      if (!isMounted) return;

      setUser(session?.user ?? null);
      setIsAuthenticated(!!session);
      setIsLoadingAuth(false);

      if (session?.user) {
        fetchUserRole(session.user.id, session.user.email);
      } else {
        setUserRole(null);
      }
    };

    const initTimeout = window.setTimeout(() => {
      if (!isMounted) return;
      setAuthError('Authentication initialization timed out.');
      setIsLoadingAuth(false);
    }, AUTH_INIT_TIMEOUT_MS);

    supabase.auth.getSession()
      .then(({ data: { session }, error }) => {
        if (error) throw error;
        setAuthError(null);
        applySession(session);
      })
      .catch((error) => {
        console.error('Error restoring auth session:', error);
        if (!isMounted) return;
        setAuthError(error.message || 'Failed to restore session.');
        setUser(null);
        setIsAuthenticated(false);
        setUserRole(null);
        setIsLoadingAuth(false);
      })
      .finally(() => {
        window.clearTimeout(initTimeout);
      });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthError(null);
      applySession(session);
    });

    return () => {
      isMounted = false;
      window.clearTimeout(initTimeout);
      subscription.unsubscribe();
    };
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setIsAuthenticated(false);
    setUserRole(null);
  };

  const navigateToLogin = () => {
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      isLoadingAuth,
      isLoadingPublicSettings: false, // No longer needed
      authError,
      appPublicSettings: null,        // No longer needed
      userRole,
      logout,
      navigateToLogin,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
