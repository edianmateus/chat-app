const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000, // Timeout após 5 segundos
    });

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    
    // Event listeners para monitorar a conexão
    mongoose.connection.on('error', (err) => {
      console.error(`❌ MongoDB connection error: ${err}`);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️ MongoDB disconnected');
    });
  } catch (error) {
    console.error(`❌ MongoDB connection error: ${error.message}`);
    console.error('⚠️ Server will continue running, but database operations will fail.');
    console.error('Please ensure MongoDB is running or update MONGODB_URI in .env file');
    // Não fazer exit para permitir que o servidor continue (útil para desenvolvimento)
    // Em produção, você pode querer descomentar a linha abaixo
    // process.exit(1);
  }
};

module.exports = connectDB;

