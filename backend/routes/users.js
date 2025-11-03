const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const User = require('../models/User');

// Listar todos os usuários
router.get('/', authenticate, async (req, res) => {
  try {
    // Verificar conexão com MongoDB
    const mongoose = require('mongoose');
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ 
        success: false, 
        message: 'Banco de dados não está conectado. Por favor, verifique se o MongoDB está rodando.',
        users: []
      });
    }

    const users = await User.find({ _id: { $ne: req.user._id } })
      .select('name username online lastSeen')
      .sort({ online: -1, name: 1 });

    res.json({
      success: true,
      users,
    });
  } catch (error) {
    console.error('Erro ao listar usuários:', error);
    
    // Verificar se é erro de conexão
    if (error.name === 'MongoServerError' || error.message.includes('buffering timed out')) {
      return res.status(503).json({ 
        success: false, 
        message: 'Erro de conexão com o banco de dados.',
        users: []
      });
    }
    
    res.status(500).json({ 
      success: false, 
      message: 'Erro ao listar usuários',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
      users: []
    });
  }
});

// Logout
router.post('/logout', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (user) {
      user.online = false;
      user.lastSeen = new Date();
      await user.save();
    }

    res.json({
      success: true,
      message: 'Logout realizado com sucesso',
    });
  } catch (error) {
    console.error('Erro no logout:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erro ao realizar logout',
      error: error.message 
    });
  }
});

module.exports = router;


