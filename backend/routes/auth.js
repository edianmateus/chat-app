const express = require('express');
const router = express.Router();
const passport = require('../config/passport');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Register
router.post('/register', async (req, res) => {
  try {
    const { name, username, password } = req.body;

    // Validação básica
    if (!name || !username || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Nome, username e senha são obrigatórios' 
      });
    }

    if (password.length < 6) {
      return res.status(400).json({ 
        success: false, 
        message: 'A senha deve ter no mínimo 6 caracteres' 
      });
    }

    // Verificar se usuário já existe
    const existingUser = await User.findOne({ username: username.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ 
        success: false, 
        message: 'Username já está em uso' 
      });
    }

    // Criar novo usuário
    const user = new User({
      name,
      username: username.toLowerCase(),
      password,
    });

    await user.save();

    // Gerar JWT
    const token = jwt.sign(
      { id: user._id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      success: true,
      message: 'Usuário cadastrado com sucesso',
      token,
      user: {
        id: user._id,
        name: user.name,
        username: user.username,
      },
    });
  } catch (error) {
    console.error('Erro no cadastro:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erro ao cadastrar usuário',
      error: error.message 
    });
  }
});

// Login
router.post('/login', (req, res, next) => {
  passport.authenticate('local', { session: false }, (err, user, info) => {
    if (err) {
      return res.status(500).json({ 
        success: false, 
        message: 'Erro no servidor',
        error: err.message 
      });
    }

    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: info.message || 'Credenciais inválidas' 
      });
    }

    // Gerar JWT
    const token = jwt.sign(
      { id: user._id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Atualizar status online
    user.online = true;
    user.lastSeen = new Date();
    user.save();

    res.json({
      success: true,
      message: 'Login realizado com sucesso',
      token,
      user: {
        id: user._id,
        name: user.name,
        username: user.username,
        online: user.online,
      },
    });
  })(req, res, next);
});

module.exports = router;


