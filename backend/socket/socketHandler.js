const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Message = require('../models/Message');

// Mapa para armazenar sockets ativos por userId
const activeUsers = new Map();

const initializeSocket = (io) => {
  // Middleware para autenticar socket connections
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      
      if (!token) {
        return next(new Error('Token não fornecido'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id);
      
      if (!user) {
        return next(new Error('Usuário não encontrado'));
      }

      socket.userId = user._id.toString();
      socket.username = user.username;
      
      next();
    } catch (error) {
      next(new Error('Autenticação falhou'));
    }
  });

  io.on('connection', async (socket) => {
    const userId = socket.userId;

    console.log(`Usuário conectado: ${socket.username} (${userId})`);

    // Adicionar usuário à lista de usuários ativos
    if (!activeUsers.has(userId)) {
      activeUsers.set(userId, []);
    }
    activeUsers.get(userId).push(socket.id);

    // Atualizar status online no banco
    await User.findByIdAndUpdate(userId, { 
      online: true, 
      lastSeen: new Date() 
    });

    // Notificar outros usuários que este usuário está online
    socket.broadcast.emit('user:online', {
      userId,
      username: socket.username,
    });

    // Enviar lista de usuários online para o usuário recém-conectado
    const onlineUsers = await User.find({ online: true, _id: { $ne: userId } })
      .select('_id name username online');
    socket.emit('users:list', onlineUsers);

    // Escutar mensagens enviadas
    socket.on('message:send', async (data) => {
      try {
        const { to, content } = data;

        if (!to || !content) {
          return socket.emit('message:error', {
            message: 'Destinatário e conteúdo são obrigatórios',
          });
        }

        // Criar mensagem no banco
        const message = new Message({
          from: userId,
          to,
          content,
        });

        await message.save();
        await message.populate('from', 'name username');
        await message.populate('to', 'name username');

        // Enviar mensagem para o destinatário se estiver online
        const recipientSockets = activeUsers.get(to);
        if (recipientSockets && recipientSockets.length > 0) {
          recipientSockets.forEach((socketId) => {
            io.to(socketId).emit('message:receive', message);
          });
        }

        // Confirmar para o remetente
        socket.emit('message:sent', message);

        // Notificar o destinatário sobre nova mensagem
        if (recipientSockets && recipientSockets.length > 0) {
          recipientSockets.forEach((socketId) => {
            io.to(socketId).emit('notification:new-message', {
              from: {
                id: message.from._id,
                name: message.from.name,
                username: message.from.username,
              },
              message: message.content,
              timestamp: message.createdAt,
            });
          });
        }
      } catch (error) {
        console.error('Erro ao enviar mensagem:', error);
        socket.emit('message:error', {
          message: 'Erro ao enviar mensagem',
          error: error.message,
        });
      }
    });

    // Disconnect
    socket.on('disconnect', async () => {
      console.log(`Usuário desconectado: ${socket.username} (${userId})`);

      // Remover socket da lista
      const sockets = activeUsers.get(userId);
      if (sockets) {
        const index = sockets.indexOf(socket.id);
        if (index > -1) {
          sockets.splice(index, 1);
        }

        // Se não há mais sockets, marcar como offline
        if (sockets.length === 0) {
          activeUsers.delete(userId);
          
          await User.findByIdAndUpdate(userId, { 
            online: false,
            lastSeen: new Date(),
          });

          // Notificar outros usuários
          socket.broadcast.emit('user:offline', {
            userId,
            username: socket.username,
          });
        }
      }
    });
  });

  return io;
};

module.exports = { initializeSocket, activeUsers };


