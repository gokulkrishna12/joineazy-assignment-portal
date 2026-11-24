import { createContext, useContext, useEffect, useState } from 'react';
import api from '../api/axios';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('joineazy_token');
    if (!token) {
      setLoading(false);
      return;
    }

    api
      .get('/auth/me')
      .then((res) => setUser(res.data.user))
      .catch(() => {
        localStorage.removeItem('joineazy_token');
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    localStorage.setItem('joineazy_token', res.data.token);
    setUser(res.data.user);
    return res.data.user;
  };

  const sendRegisterOtp = async (email) => {
    const res = await api.post('/auth/send-register-otp', { email });
    return res.data;
  };

  const register = async (payload) => {
    const res = await api.post('/auth/register', payload);
    localStorage.setItem('joineazy_token', res.data.token);
    setUser(res.data.user);
    return res.data.user;
  };

  const googleLogin = async (credential, role = 'STUDENT') => {
    const res = await api.post('/auth/google', { credential, role });
    localStorage.setItem('joineazy_token', res.data.token);
    setUser(res.data.user);
    return res.data.user;
  };

  const forgotPassword = async (email) => {
    const res = await api.post('/auth/forgot-password', { email });
    return res.data;
  };

  const resetPassword = async ({ email, otp, newPassword }) => {
    const res = await api.post('/auth/reset-password', { email, otp, newPassword });
    return res.data;
  };

  const logout = () => {
    localStorage.removeItem('joineazy_token');
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        sendRegisterOtp,
        register,
        googleLogin,
        forgotPassword,
        resetPassword,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);