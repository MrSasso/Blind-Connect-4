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
let waitingQueue = []; // <--- LA NOSTRA SALA D'ATTESA

io.on('connection', (socket) => {
  console.log('Giocatore connesso! ID:', socket.id);

  // --- MATCHMAKING CASUALE ---
  socket.on('find_random_match', () => {
    if (waitingQueue.includes(socket.id)) return; // Evita doppi click

    if (waitingQueue.length > 0) {
      // C'è già qualcuno! Li accoppiamo.
      const opponentId = waitingQueue.shift(); // Tira fuori il primo in fila
      const roomCode = Math.random().toString(36).substring(2, 6).toUpperCase(); 
      
      rooms[roomCode] = { players: [opponentId, socket.id] };
      
      // Facciamo entrare entrambi nella stessa stanza virtuale
      const opponentSocket = io.sockets.sockets.get(opponentId);
      if (opponentSocket) opponentSocket.join(roomCode);
      socket.join(roomCode); 
      
      // Diciamo a entrambi che il match è pronto e ASSEGNIAMO I RUOLI (1 e 2)
      io.to(opponentId).emit('match_found', { roomCode, role: 1 });
      io.to(socket.id).emit('match_found', { roomCode, role: 2 });
      
      console.log(`[!] Match Casuale Creato: Stanza ${roomCode}`);
    } else {
      // Non c'è nessuno, si mette in fila
      waitingQueue.push(socket.id);
      console.log(`[?] Giocatore in coda: ${socket.id}`);
    }
  });

  // --- LOGICA STANZE PRIVATE (Invariata) ---
  socket.on('create_room', () => { /* ... */ });
  socket.on('join_room', (roomCode) => { /* ... */ });
  
  socket.on('play_move', (data) => {
    io.to(data.roomCode).emit('move_played', data.column);
  });

  socket.on('disconnect', () => {
    console.log('[-] Giocatore disconnesso:', socket.id);
    // Se si disconnette mentre è in coda, lo togliamo
    waitingQueue = waitingQueue.filter(id => id !== socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server multiplayer ACCESO sulla porta ${PORT} 🚀`);
});