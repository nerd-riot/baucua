import http from 'node:http';
import { Server, Socket } from 'socket.io';
import { ClientToServerEvents, ServerToClientEvents, ChatMessage } from '@bau-cua/types';
import { RoomManager } from './room-manager.js';

const PORT = parseInt(process.env.PORT || '3001', 10);
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';

const server = http.createServer((req, res) => {
  // Simple health check and basic REST endpoint
  if (req.url === '/health' || req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', name: 'Bau Cua Online Realtime Server', timestamp: Date.now() }));
    return;
  }

  if (req.url === '/api/rooms' && req.method === 'GET') {
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    });
    res.end(JSON.stringify({ rooms: roomManager.listPublicRooms() }));
    return;
  }

  res.writeHead(404);
  res.end();
});

const io = new Server<ClientToServerEvents, ServerToClientEvents>(server, {
  cors: {
    origin: CORS_ORIGIN,
    methods: ['GET', 'POST'],
    credentials: false,
  },
  pingInterval: 10000,
  pingTimeout: 5000,
});

const roomManager = new RoomManager();

io.on('connection', (socket: Socket<ClientToServerEvents, ServerToClientEvents>) => {
  let currentRoomId: string | undefined;

  // 1. Guest Login
  socket.on('guest:login', ({ nickname, avatarId, deviceId }, callback) => {
    try {
      const player = roomManager.registerPlayer(socket.id, nickname, avatarId, deviceId);
      callback({ success: true, player });
    } catch (err: unknown) {
      callback({ success: false, error: err instanceof Error ? err.message : 'Login failed' });
    }
  });

  // 2. List Public Rooms
  socket.on('lobby:listRooms', (callback) => {
    const rooms = roomManager.listPublicRooms();
    callback({ success: true, rooms });
  });

  // 3. Create Room
  socket.on('room:create', (options, callback) => {
    const player = roomManager.getPlayerBySocket(socket.id);
    if (!player) {
      return callback({ success: false, error: 'Chưa đăng nhập người chơi' });
    }

    const room = roomManager.createRoom(player, options);
    currentRoomId = room.id;
    socket.join(room.id);

    callback({ success: true, room });
    // Notify lobby of updated rooms
    io.emit('lobby:roomsUpdated', roomManager.listPublicRooms());
  });

  // 4. Join Room
  socket.on('room:join', ({ roomIdOrCode, passcode }, callback) => {
    const player = roomManager.getPlayerBySocket(socket.id);
    if (!player) {
      return callback({ success: false, error: 'Chưa đăng nhập người chơi' });
    }

    const result = roomManager.joinRoom(player, roomIdOrCode, passcode);
    if (!result.success || !result.room) {
      return callback({ success: false, error: result.error });
    }

    currentRoomId = result.room.id;
    socket.join(result.room.id);

    // Broadcast to room members that player joined
    socket.to(result.room.id).emit('room:playerJoined', player);
    callback({ success: true, room: result.room });
  });

  // 5. Leave Room
  const handleLeaveRoom = () => {
    if (!currentRoomId) return;
    const player = roomManager.getPlayerBySocket(socket.id);
    if (!player) return;

    const roomId = currentRoomId;
    socket.leave(roomId);
    currentRoomId = undefined;

    const { room, newHostId } = roomManager.leaveRoom(player.id, roomId);
    if (room) {
      io.to(roomId).emit('room:playerLeft', { playerId: player.id, newHostId });
      if (newHostId) {
        io.to(roomId).emit('room:hostChanged', { newHostId });
      }
    }
  };

  socket.on('room:leave', (callback) => {
    handleLeaveRoom();
    callback({ success: true });
  });

  // 6. Set Ready
  socket.on('room:setReady', ({ isReady }, callback) => {
    if (!currentRoomId) return callback({ success: false });
    const player = roomManager.getPlayerBySocket(socket.id);
    if (!player) return callback({ success: false });

    const ok = roomManager.setPlayerReady(currentRoomId, player.id, isReady);
    if (ok) {
      io.to(currentRoomId).emit('room:playerReadyChanged', { playerId: player.id, isReady });
    }
    callback({ success: ok });
  });

  // 7. Host Start Round
  socket.on('host:startRound', (callback) => {
    if (!currentRoomId) return callback({ success: false, error: 'Không ở trong phòng' });
    const player = roomManager.getPlayerBySocket(socket.id);
    const room = roomManager.getRoom(currentRoomId);
    if (!room || !player || room.hostId !== player.id) {
      return callback({ success: false, error: 'Chỉ chủ phòng (Host) mới có quyền bắt đầu vòng chơi' });
    }

    const durationSeconds = 25;
    const result = roomManager.startRound(currentRoomId, durationSeconds);
    if (!result.success || !result.round) {
      return callback({ success: false, error: result.error });
    }

    io.to(currentRoomId).emit('round:started', {
      roundId: result.round.id,
      roundNumber: result.round.roundNumber,
      bettingEndsAt: result.round.bettingEndsAt || Date.now() + durationSeconds * 1000,
      durationSeconds,
    });

    callback({ success: true });

    // Set auto-timer for round lock
    const roomId = currentRoomId;
    const timer = setTimeout(() => {
      triggerRoundLockAndRolling(roomId);
    }, durationSeconds * 1000);
    roomManager.setRoomTimer(roomId, timer);
  });

  // Function to lock bets, start rolling, and settle
  const triggerRoundLockAndRolling = (roomId: string) => {
    const room = roomManager.getRoom(roomId);
    if (!room || room.currentRound.state !== 'BETTING') return;

    room.currentRound.state = 'ROLLING';
    const shakingDurationMs = 3500; // 3.5s smooth rolling animation

    io.to(roomId).emit('round:rolling', {
      roundId: room.currentRound.id,
      shakingDurationMs,
    });

    // Schedule settlement reveal after shaking duration
    const settleTimer = setTimeout(() => {
      const outcome = roomManager.rollAndSettle(roomId);
      if (outcome.success && outcome.diceResult && outcome.settlements) {
        const boardSummary = roomManager.getBoardSummary(roomId);
        io.to(roomId).emit('round:settled', {
          roundId: room.currentRound.id,
          diceResult: outcome.diceResult,
          settlements: outcome.settlements,
          boardSummary,
        });

        // Also broadcast full state sync to ensure all balances are synced
        io.to(roomId).emit('room:stateSync', room);
      }
    }, shakingDurationMs);

    roomManager.setRoomTimer(roomId, settleTimer);
  };

  // 8. Host Lock Betting early
  socket.on('host:lockBetting', (callback) => {
    if (!currentRoomId) return callback({ success: false, error: 'Không ở trong phòng' });
    const player = roomManager.getPlayerBySocket(socket.id);
    const room = roomManager.getRoom(currentRoomId);
    if (!room || !player || room.hostId !== player.id) {
      return callback({ success: false, error: 'Chỉ chủ phòng mới có quyền khóa cược' });
    }

    roomManager.clearRoomTimer(currentRoomId);
    triggerRoundLockAndRolling(currentRoomId);
    callback({ success: true });
  });

  // 9. Place Bet
  socket.on('bet:place', (req, callback) => {
    if (!currentRoomId) return callback({ success: false, error: 'Chưa vào phòng' });
    const player = roomManager.getPlayerBySocket(socket.id);
    if (!player) return callback({ success: false, error: 'Người chơi không hợp lệ' });

    const result = roomManager.placeBet(currentRoomId, player.id, req);
    if (!result.success || !result.bet) {
      return callback({ success: false, error: result.error });
    }

    const boardSummary = roomManager.getBoardSummary(currentRoomId);
    io.to(currentRoomId).emit('round:betPlaced', {
      bet: result.bet,
      boardSummary,
    });

    callback({
      success: true,
      bet: result.bet,
      newBalance: result.newBalance,
    });
  });

  // 10. Chat Message
  socket.on('chat:send', ({ text, stickerId }, callback) => {
    if (!currentRoomId) return callback({ success: false, error: 'Không ở trong phòng' });
    const player = roomManager.getPlayerBySocket(socket.id);
    if (!player) return callback({ success: false, error: 'Không xác thực' });

    const message: ChatMessage = {
      id: 'msg_' + crypto.randomUUID().slice(0, 8),
      senderId: player.id,
      senderNickname: player.nickname,
      avatarId: player.avatarId,
      text: text?.trim().slice(0, 100),
      stickerId,
      timestamp: Date.now(),
    };

    io.to(currentRoomId).emit('chat:message', message);
    callback({ success: true });
  });

  // 11. Daily / Bonus reload
  socket.on('player:reloadPoints', (callback) => {
    const player = roomManager.getPlayerBySocket(socket.id);
    if (!player) return callback({ success: false, newBalance: 0 });

    const { newBalance } = roomManager.getLedger().reloadPoints(player.id, 1000);
    player.points = newBalance;
    callback({ success: true, newBalance });
  });

  // 12. Disconnect
  socket.on('disconnect', () => {
    handleLeaveRoom();
  });
});

server.listen(PORT, () => {
  console.log(`🎲 Bầu Cua Online Server running on port ${PORT}`);
});
