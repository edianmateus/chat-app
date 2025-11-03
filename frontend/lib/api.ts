import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Adicionar token às requisições
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Interceptor para redirecionar em caso de 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export interface User {
  id?: string;
  _id?: string;
  name: string;
  username: string;
  online?: boolean;
  lastSeen?: string;
}

// Helper para normalizar User (MongoDB retorna _id, mas frontend usa id)
export const normalizeUser = (user: any): User => {
  return {
    ...user,
    id: user.id || user._id,
    _id: user._id || user.id,
  };
};

export interface Message {
  _id: string;
  from: User;
  to: User;
  content: string;
  read: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RegisterData {
  name: string;
  username: string;
  password: string;
}

export interface LoginData {
  username: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  token: string;
  user: User;
}

// Auth API
export const authAPI = {
  register: async (data: RegisterData): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/auth/register', data);
    return response.data;
  },

  login: async (data: LoginData): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/auth/login', data);
    return response.data;
  },
};

// Users API
export const usersAPI = {
  list: async (): Promise<User[]> => {
    const response = await api.get<{ success: boolean; users: User[] }>('/users');
    return (response.data.users || []).map(normalizeUser);
  },

  logout: async (): Promise<{ success: boolean; message: string }> => {
    const response = await api.post<{ success: boolean; message: string }>('/users/logout');
    return response.data;
  },
};

// Messages API
export const messagesAPI = {
  getHistory: async (userId: string): Promise<Message[]> => {
    if (!userId || userId === 'undefined') {
      throw new Error('User ID is required');
    }
    const response = await api.get<{ success: boolean; messages: Message[] }>(
      `/messages/${userId}`
    );
    // Normalizar usuários nas mensagens também
    return (response.data.messages || []).map((msg: any) => ({
      ...msg,
      from: normalizeUser(msg.from),
      to: normalizeUser(msg.to),
    }));
  },
};

export default api;


