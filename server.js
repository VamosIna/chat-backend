// server.js
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

const app = express();
app.use(cors());
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Config
const MAX_USERS = 10; // Ubah sesuai kebutuhan
const MIN_USERS = 2;
const onlineUsers = new Map();

io.on('connection', (socket) => {
  console.log('Connection attempt:', socket.id);

  // Handle registrasi user
  socket.on('register-user', (username) => {
    if(onlineUsers.size >= MAX_USERS) {
      socket.emit('error', 'Chat room full (Max 10 users)');
      socket.disconnect();
      return;
    }
    
    onlineUsers.set(socket.id, username);
    io.emit('user-list', Array.from(onlineUsers.values()));
    console.log('Registered:', username);
    
    // Notif minimal user tercapai
    if(onlineUsers.size >= MIN_USERS) {
      io.emit('chat-ready', true);
    }
  });

  // Handle pesan
  socket.on('send-message', (message) => {
    const sender = onlineUsers.get(socket.id);
    if(!sender) return;
    
    io.emit('new-message', {
      sender,
      text: message.text,
      type: message.type || 'text',
      timestamp: new Date().toISOString()
    });
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    const username = onlineUsers.get(socket.id);
    onlineUsers.delete(socket.id);
    
    io.emit('user-list', Array.from(onlineUsers.values()));
    console.log('Disconnected:', username);
    
    // Notif jika user dibawah minimal
    if(onlineUsers.size < MIN_USERS) {
      io.emit('chat-ready', false);
    }
  });
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});