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
        // Fetch user data with a second API call (Strapi v5 doesn't include role in login response)
        const meResponse = await fetch(`${import.meta.env.VITE_STRAPI_URL}/api/users/me`, {
          headers: { 
            'Authorization': `Bearer ${data.jwt}`,
            'Content-Type': 'application/json'
          },
        });
        
        if (!meResponse.ok) {
          console.log('AuthContext: Failed to fetch user data');
          return false;
        }
        
        const meData = await meResponse.json();
        
        console.log('AuthContext: User data from /users/me', meData);
        
        // Check if user email is in allowlist (Strapi v5 sanitizes role from /users/me)
        const ALLOWED_EMAILS = new Set(['dealytw@gmail.com', 'admin@dealy.tw']);
        if (!ALLOWED_EMAILS.has(meData.email)) {
          console.log('AuthContext: Email not in allowlist', { email: meData.email });
          return false;
        }

        setToken(data.jwt);
        setUser({
          id: meData.id,
          username: meData.username,
          email: meData.email,
          role: 'Admin', // Fixed role since we're using email allowlist
        });

        // Store in session storage
        sessionStorage.setItem('admin_token', data.jwt);
        sessionStorage.setItem('admin_user', JSON.stringify({
          id: meData.id,
          username: meData.username,
          email: meData.email,
          role: 'Admin',
        }));

        console.log('AuthContext: Login successful', { 
          user: meData.username, 
          email: meData.email,
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