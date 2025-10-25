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
      
      const response = await fetch(`${import.meta.env.VITE_STRAPI_URL}/api/auth/local?populate[role]=*`, {
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
      
      if (data.jwt && data.user) {
        // Fetch user's role with a second API call (Strapi v5 doesn't include role in login response)
        const meResponse = await fetch(`${import.meta.env.VITE_STRAPI_URL}/api/users/me?populate[role][populate]=*`, {
          headers: { 
            'Authorization': `Bearer ${data.jwt}`,
            'Content-Type': 'application/json'
          },
        });
        
        if (!meResponse.ok) {
          console.log('AuthContext: Failed to fetch user role');
          return false;
        }
        
        const meData = await meResponse.json();
        
        console.log('AuthContext: Full /users/me response', meData);
        console.log('AuthContext: User data from /users/me', meData);
        console.log('AuthContext: Role object from /users/me', meData?.role);
        
        const userRole = meData?.role?.name || meData?.role?.type;
        
        console.log('AuthContext: User role from /users/me', { role: userRole });
        
        // Check if user has admin role
        const ALLOWED_ROLES = ['Super Admin', 'Super Editor', 'Editor', 'Authenticated', 'EditorApp'];
        if (!ALLOWED_ROLES.includes(userRole)) {
          console.log('AuthContext: User role not authorized', { role: userRole });
          return false;
        }

        setToken(data.jwt);
        setUser({
          id: data.user.id,
          username: data.user.username,
          email: data.user.email,
          role: userRole,
        });

        // Store in session storage
        sessionStorage.setItem('admin_token', data.jwt);
        sessionStorage.setItem('admin_user', JSON.stringify({
          id: data.user.id,
          username: data.user.username,
          email: data.user.email,
          role: userRole,
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