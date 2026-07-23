import { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export function usePageVisibility() {
  const [isVisible, setIsVisible] = useState(document.visibilityState === 'visible');
  useEffect(() => {
    const onVisibilityChange = () => setIsVisible(document.visibilityState === 'visible');
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, []);
  return isVisible;
}

export function SocketProvider({ children }) {
  const { user, token } = useAuth();
  const [socket, setSocket] = useState(null);

  // Initialise socket on auth change
  useEffect(() => {
    if (!user) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
      return;
    }
    const VITE_API_URL = import.meta.env.VITE_API_URL || (window.location.hostname === 'localhost' ? 'http://localhost:3001' : undefined);
    const newSocket = io(VITE_API_URL, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
      auth: { token },
    });
    newSocket.on('connect', () => console.log('Socket connected:', newSocket.id));
    newSocket.on('connect_error', (err) => console.error('Socket connection error:', err.message));
    setSocket(newSocket);
    return () => newSocket.disconnect();
  }, [user, token]);

  // Reconnect when page becomes visible (debounced)
  useEffect(() => {
    if (!socket) return;
    let timeoutId = null;
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          if (socket.disconnected) {
            console.log('Reconnecting socket due to visibility change');
            socket.connect();
          }
        }, 300);
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [socket]);

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}
