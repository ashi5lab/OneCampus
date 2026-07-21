import { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const { user, token } = useAuth();
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    // Only connect if the user is authenticated.
    // AuthContext handles the token, which is stored in an HTTP-only cookie,
    // so socket.io-client withCredentials: true will automatically send it.
    if (!user) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
      return;
    }

    const VITE_API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
    
    // We pass the token via auth just in case we switch from cookies to local storage
    // but the cookie is also sent because of withCredentials: true
    const newSocket = io(VITE_API_URL, {
      withCredentials: true,
      transports: ['websocket', 'polling'], // Prefer websocket
      auth: { token }
    });

    newSocket.on('connect', () => {
      console.log('Socket connected:', newSocket.id);
    });

    newSocket.on('connect_error', (err) => {
      console.error('Socket connection error:', err.message);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [user, token]);

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}
