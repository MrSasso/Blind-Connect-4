import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

const app = express();
app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*", 
    methods: ["GET", "POST"]
  }
});

const rooms = {};

io.on('connection', (socket) => {
  console.log('Giocatore connesso! ID:', socket.id);

  socket.on('create_room', () => {
    const roomCode = Math.random().toString(36).substring(2, 6).toUpperCase(); 
    
    rooms[roomCode] = { players: [socket.id] };
    socket.join(roomCode); 
    
    socket.emit('room_created', roomCode);
    console.log(`[+] Stanza creata: ${roomCode} dall'utente ${socket.id}`);
  });

  socket.on('join_room', (roomCode) => {
    const room = rooms[roomCode];
    
    if (room && room.players.length === 1) {
      room.players.push(socket.id);
      socket.join(roomCode);
      
      io.to(roomCode).emit('game_ready', `La stanza ${roomCode} è piena. Prepararsi!`);
      console.log(`[>] Utente ${socket.id} è entrato nella stanza ${roomCode}`);
    } else {
      socket.emit('room_error', 'Stanza inesistente o già piena!');
    }
  });

  socket.on('disconnect', () => {
    console.log('[-] Giocatore disconnesso:', socket.id);
    // Più avanti gestiremo cosa succede se uno chiude l'app a metà partita
  });
});

server.listen(3000, () => {
  console.log('Server multiplayer ACCESO sulla porta 3000 🚀');
});