import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface User {
  id: number;
  username: string;
  email: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check for existing session on mount
  useEffect(() => {
    const storedToken = sessionStorage.getItem('admin_token');
    const storedUser = sessionStorage.getItem('admin_user');
    
    console.log('AuthContext: Checking stored session', { storedToken: !!storedToken, storedUser: !!storedUser });
    
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
      console.log('AuthContext: Session restored', { token: !!storedToken, user: JSON.parse(storedUser) });
    }
    setIsLoading(false);
  }, []);

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      const requestBody = {
        identifier: username,
        password: password,
      };
      
      const response = await fetch(`${import.meta.env.VITE_STRAPI_URL}/api/auth/local`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        return false;
      }

      const data = await response.json();
      
      console.log('AuthContext: Full response data', data);
      console.log('AuthContext: User object', data.user);
      console.log('AuthContext: User role', data.user?.role);
      
      if (data.jwt && data.user) {
        // Check if user has admin role (Strapi v5 structure)
        const userRole = data.user.role?.type || data.user.role?.name;
        if (userRole !== 'Super Admin' && userRole !== 'Super Editor' && userRole !== 'Editor' && userRole !== 'Authenticated' && userRole !== 'EditorApp') {
          console.log('AuthContext: User role not authorized', { role: userRole });
          return false;
        }

        setToken(data.jwt);
        setUser({
          id: data.user.id,
          username: data.user.username,
          email: data.user.email,
          role: data.user.role?.type || 'User',
        });

        // Store in session storage
        sessionStorage.setItem('admin_token', data.jwt);
        sessionStorage.setItem('admin_user', JSON.stringify({
          id: data.user.id,
          username: data.user.username,
          email: data.user.email,
          role: data.user.role?.type || 'User',
        }));

        console.log('AuthContext: Login successful', { 
          user: data.user.username, 
          role: userRole,
          token: !!data.jwt 
        });

        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    sessionStorage.removeItem('admin_token');
    sessionStorage.removeItem('admin_user');
  };

  const isAuthenticated = !!token && !!user;

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        logout,
        isLoading,
        isAuthenticated,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};