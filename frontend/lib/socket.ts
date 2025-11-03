import { io, Socket } from 'socket.io-client';
import { Message, User } from './api';
import { getAuthToken } from './auth';

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

let socket: Socket | null = null;

export const connectSocket = (): Socket => {
  if (socket?.connected) {
    return socket;
  }

  const token = getAuthToken();
  if (!token) {
    throw new Error('Token não encontrado');
  }

  socket = io(SOCKET_URL, {
    auth: {
      token,
    },
    transports: ['websocket', 'polling'],
  });

  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export const getSocket = (): Socket | null => {
  return socket;
};

export interface SocketEvents {
  'message:send': (data: { to: string; content: string }) => void;
  'message:receive': (message: Message) => void;
  'message:sent': (message: Message) => void;
  'message:error': (error: { message: string }) => void;
  'user:online': (data: { userId: string; username: string }) => void;
  'user:offline': (data: { userId: string; username: string }) => void;
  'users:list': (users: User[]) => void;
  'notification:new-message': (data: {
    from: User;
    message: string;
    timestamp: string;
  }) => void;
}

export default socket;


