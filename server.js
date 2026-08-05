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

// LE NOSTRE 2 CODE DISTINTE
let queueNormal = [];
let queueBlind = [];

io.on('connection', (socket) => {
  console.log('Giocatore connesso! ID:', socket.id);

  // --- MATCHMAKING CASUALE ---
  socket.on('find_random_match', (mode) => {
    // 1. Rimuoviamo il giocatore se era già in una coda per evitare cloni
    queueNormal = queueNormal.filter(id => id !== socket.id);
    queueBlind = queueBlind.filter(id => id !== socket.id);

    // 2. Selezioniamo la coda in base alla modalità scelta
    let targetQueue;
    if (mode === 'NORMAL') targetQueue = queueNormal;
    else if (mode === 'BLIND') targetQueue = queueBlind;
    else return;

    if (targetQueue.length > 0) {
      // C'è un avversario!
      const opponentId = targetQueue.shift(); 
      const roomCode = Math.random().toString(36).substring(2, 6).toUpperCase(); 
      
      rooms[roomCode] = { players: [opponentId, socket.id] };
      
      const opponentSocket = io.sockets.sockets.get(opponentId);
      if (opponentSocket) opponentSocket.join(roomCode);
      socket.join(roomCode); 
      
      // 3. LANCIO DELLA MONETA: Decidiamo casualmente chi è il Giocatore 1
      const isOpponentFirst = Math.random() > 0.5;
      
      const opponentRole = isOpponentFirst ? 1 : 2;
      const myRole = isOpponentFirst ? 2 : 1;

      // Inviamo i ruoli randomizzati ai due giocatori
      io.to(opponentId).emit('match_found', { roomCode, role: opponentRole, mode: mode });
      io.to(socket.id).emit('match_found', { roomCode, role: myRole, mode: mode });
      
      console.log(`[!] Match ${mode} Creato: Stanza ${roomCode} | Inizia: ${isOpponentFirst ? 'Chi era in attesa' : 'Il nuovo arrivato'}`);
    } else {
      // Nessuno in coda, si aspetta
      targetQueue.push(socket.id);
      console.log(`[?] Giocatore in coda ${mode}: ${socket.id}`);
    }
  });

  // --- LOGICA STANZE PRIVATE ---
  socket.on('create_room', () => { /* Eventuali implementazioni future */ });
  socket.on('join_room', (roomCode) => { /* Eventuali implementazioni future */ });
  
  socket.on('play_move', (data) => {
    io.to(data.roomCode).emit('move_played', data.column);
  });

  socket.on('disconnect', () => {
    console.log('[-] Giocatore disconnesso:', socket.id);
    // Pulizia delle code
    queueNormal = queueNormal.filter(id => id !== socket.id);
    queueBlind = queueBlind.filter(id => id !== socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server multiplayer ACCESO sulla porta ${PORT} 🚀`);
});