'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { usersAPI, messagesAPI, User, Message } from '@/lib/api';
import { isAuthenticated, getUser, clearAuth } from '@/lib/auth';
import { connectSocket, disconnectSocket, getSocket, SocketEvents } from '@/lib/socket';

export default function ChatPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [notifications, setNotifications] = useState<
    Array<{ id: string; from: User; message: string; timestamp: string }>
  >([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<any>(null);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }

    const user = getUser();
    setCurrentUser(user);

    // Conectar socket
    try {
      const socket = connectSocket();
      socketRef.current = socket;

      // Listener para receber mensagens
      socket.on('message:receive', (message: Message) => {
        // Normalizar usuários na mensagem
        const normalizedMessage = {
          ...message,
          from: {
            ...message.from,
            id: message.from.id || message.from._id,
            _id: message.from._id || message.from.id,
          },
          to: {
            ...message.to,
            id: message.to.id || message.to._id,
            _id: message.to._id || message.to.id,
          },
        };

        setMessages((prev) => {
          // Evitar duplicatas
          if (prev.some((m) => m._id === normalizedMessage._id)) {
            return prev;
          }
          return [...prev, normalizedMessage];
        });

        // Scroll para última mensagem
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      });

      // Listener para confirmação de envio
      socket.on('message:sent', (message: Message) => {
        // Normalizar usuários na mensagem
        const normalizedMessage = {
          ...message,
          from: {
            ...message.from,
            id: message.from.id || message.from._id,
            _id: message.from._id || message.from.id,
          },
          to: {
            ...message.to,
            id: message.to.id || message.to._id,
            _id: message.to._id || message.to.id,
          },
        };

        setMessages((prev) => {
          if (prev.some((m) => m._id === normalizedMessage._id)) {
            return prev;
          }
          return [...prev, normalizedMessage];
        });

        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      });

      // Listener para erros
      socket.on('message:error', (error: { message: string }) => {
        console.error('Erro ao enviar mensagem:', error);
        alert(error.message);
      });

      // Listener para usuários online/offline
      socket.on('user:online', (data: { userId: string; username: string }) => {
        setUsers((prev) =>
          prev.map((u) =>
            u.id === data.userId ? { ...u, online: true } : u
          )
        );
      });

      socket.on('user:offline', (data: { userId: string; username: string }) => {
        setUsers((prev) =>
          prev.map((u) =>
            u.id === data.userId ? { ...u, online: false } : u
          )
        );
      });

      // Lista inicial de usuários
      socket.on('users:list', (usersList: User[]) => {
        // Normalizar usuários recebidos via socket
        const normalizedUsers = usersList.map((user: any) => ({
          ...user,
          id: user.id || user._id,
          _id: user._id || user.id,
        }));
        setUsers(normalizedUsers);
      });

      // Notificações de novas mensagens
      socket.on('notification:new-message', (data: {
        from: User;
        message: string;
        timestamp: string;
      }) => {
        // Mostrar notificação apenas se não for o usuário selecionado
        const selectedUserId = selectedUser?.id || selectedUser?._id;
        const fromUserId = data.from.id || data.from._id;
        if (selectedUserId !== fromUserId) {
          const notificationId = Date.now().toString();
          setNotifications((prev) => [
            ...prev,
            { id: notificationId, ...data },
          ]);

          // Remover notificação após 5 segundos
          setTimeout(() => {
            setNotifications((prev) =>
              prev.filter((n) => n.id !== notificationId)
            );
          }, 5000);
        }
      });

      // Carregar lista de usuários
      loadUsers();
    } catch (error) {
      console.error('Erro ao conectar socket:', error);
      router.push('/login');
    }

    return () => {
      disconnectSocket();
    };
  }, [router]);

  useEffect(() => {
    if (selectedUser) {
      const userId = selectedUser.id || selectedUser._id;
      if (userId) {
        loadMessages(userId);
      } else {
        console.error('selectedUser não tem id ou _id:', selectedUser);
      }
    }
  }, [selectedUser]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadUsers = async () => {
    try {
      const usersList = await usersAPI.list();
      setUsers(usersList || []);
    } catch (error: any) {
      console.error('Erro ao carregar usuários:', error);
      
      // Se for erro de serviço indisponível (503), mostrar array vazio
      if (error.response?.status === 503) {
        console.warn('MongoDB não está conectado:', error.response?.data?.message);
        setUsers([]);
      } else {
        // Outros erros - manter array vazio
        setUsers([]);
      }
    }
  };

  const loadMessages = async (userId: string) => {
    if (!userId || userId === 'undefined') {
      console.warn('Tentativa de carregar mensagens com userId inválido:', userId);
      setMessages([]);
      return;
    }

    try {
      const messagesList = await messagesAPI.getHistory(userId);
      setMessages(messagesList);
    } catch (error: any) {
      console.error('Erro ao carregar mensagens:', error);
      
      // Se for erro de serviço indisponível (503), mostrar mensagem amigável
      if (error.response?.status === 503) {
        const errorMessage = error.response?.data?.message || 'Banco de dados não está disponível';
        console.warn('MongoDB não está conectado:', errorMessage);
        // Não mostrar erro para o usuário, apenas logar
        // O usuário pode continuar usando o chat, mas não verá histórico
        setMessages([]);
      } else if (error.response?.status === 404) {
        // Usuário não encontrado - não é crítico
        setMessages([]);
      } else if (error.response?.status === 400) {
        // Bad request - provavelmente userId inválido
        console.warn('ID de usuário inválido:', userId);
        setMessages([]);
      } else {
        // Outros erros
        console.error('Erro ao carregar histórico de mensagens:', error);
        setMessages([]);
      }
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !selectedUser || !socketRef.current) {
      return;
    }

    const content = newMessage.trim();
    setNewMessage('');

    const userId = selectedUser.id || selectedUser._id;
    if (!userId) {
      console.error('Não foi possível obter ID do usuário selecionado');
      return;
    }

    socketRef.current.emit('message:send', {
      to: userId,
      content,
    });
  };

  const handleLogout = async () => {
    try {
      await usersAPI.logout();
    } catch (error) {
      console.error('Erro no logout:', error);
    } finally {
      clearAuth();
      disconnectSocket();
      router.push('/login');
    }
  };

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
      {/* Sidebar com lista de usuários */}
      <div className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
            {currentUser?.name || 'Chat'}
          </h2>
          <button
            onClick={handleLogout}
            className="text-sm text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
          >
            Sair
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="p-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
            Usuários ({users.length})
          </div>
          {users.length > 0 ? (
            users.map((user) => (
              <button
                key={user.id || user._id || `user-${user.username}`}
                onClick={() => setSelectedUser(user)}
              className={`w-full p-3 text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                (selectedUser?.id || selectedUser?._id) === (user.id || user._id)
                  ? 'bg-indigo-50 dark:bg-indigo-900'
                  : ''
              }`}
              >
              <div className="flex items-center gap-2">
                <div
                  className={`w-3 h-3 rounded-full ${
                    user.online
                      ? 'bg-green-500'
                      : 'bg-gray-400'
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {user.name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    @{user.username}
                  </p>
                </div>
                {notifications.some((n) => (n.from.id || n.from._id) === (user.id || user._id)) && (
                  <span className="w-2 h-2 bg-red-500 rounded-full" />
                )}
              </div>
            </button>
            ))
          ) : (
            <div className="p-4 text-center text-gray-500 dark:text-gray-400 text-sm">
              Nenhum usuário disponível
            </div>
          )}
        </div>
      </div>

      {/* Área principal do chat */}
      <div className="flex-1 flex flex-col">
        {selectedUser ? (
          <>
            {/* Header do chat */}
            <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
              <div className="flex items-center gap-2">
                <div
                  className={`w-3 h-3 rounded-full ${
                    selectedUser.online
                      ? 'bg-green-500'
                      : 'bg-gray-400'
                  }`}
                />
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    {selectedUser.name}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    @{selectedUser.username}
                  </p>
                </div>
              </div>
            </div>

            {/* Mensagens */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length > 0 ? (
                messages.map((message) => {
                  const currentUserId = currentUser?.id || currentUser?._id;
                  const messageFromId = message.from.id || message.from._id;
                  const isOwn = messageFromId === currentUserId;
                  return (
                    <div
                      key={message._id || `msg-${message.createdAt}-${message.from.id}`}
                      className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                          isOwn
                            ? 'bg-indigo-600 text-white'
                            : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700'
                        }`}
                      >
                        {!isOwn && (
                          <p className="text-xs font-semibold mb-1 opacity-75">
                            {message.from.name}
                          </p>
                        )}
                        <p className="text-sm">{message.content}</p>
                        <p
                          className={`text-xs mt-1 ${
                            isOwn ? 'text-indigo-100' : 'text-gray-500 dark:text-gray-400'
                          }`}
                        >
                          {new Date(message.createdAt).toLocaleTimeString('pt-BR', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center text-gray-500 dark:text-gray-400">
                  Nenhuma mensagem ainda. Comece a conversar!
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input de mensagem */}
            <form onSubmit={handleSendMessage} className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Digite sua mensagem..."
                  className="flex-1 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim()}
                  className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Enviar
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-gray-500 dark:text-gray-400">
              Selecione um usuário para começar a conversar
            </p>
          </div>
        )}
      </div>

      {/* Notificações */}
      <div className="fixed top-4 right-4 space-y-2 z-50">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-4 max-w-xs"
          >
            <p className="text-sm font-semibold text-gray-900 dark:text-white">
              Nova mensagem de {notification.from.name}
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              {notification.message}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}


