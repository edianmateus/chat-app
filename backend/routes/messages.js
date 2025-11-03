const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const Message = require('../models/Message');
const User = require('../models/User');

// Obter histórico de mensagens com um usuário específico
router.get('/:userId', authenticate, async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user._id;

    // Verificar conexão com MongoDB
    const mongoose = require('mongoose');
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ 
        success: false, 
        message: 'Banco de dados não está conectado. Por favor, verifique se o MongoDB está rodando.',
        error: 'Database connection not available'
      });
    }

    // Validar formato do userId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ 
        success: false, 
        message: 'ID de usuário inválido' 
      });
    }

    // Verificar se o usuário existe
    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return res.status(404).json({ 
        success: false, 
        message: 'Usuário não encontrado' 
      });
    }

    // Buscar mensagens entre os dois usuários
    const messages = await Message.find({
      $or: [
        { from: currentUserId, to: userId },
        { from: userId, to: currentUserId },
      ],
    })
      .populate('from', 'name username')
      .populate('to', 'name username')
      .sort({ createdAt: 1 })
      .limit(100);

    res.json({
      success: true,
      messages,
    });
  } catch (error) {
    console.error('Erro ao buscar mensagens:', error);
    
    // Verificar se é erro de conexão
    if (error.name === 'MongoServerError' || error.message.includes('buffering timed out')) {
      return res.status(503).json({ 
        success: false, 
        message: 'Erro de conexão com o banco de dados. Verifique se o MongoDB está rodando.',
        error: 'Database connection error'
      });
    }
    
    res.status(500).json({ 
      success: false, 
      message: 'Erro ao buscar mensagens',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

module.exports = router;


