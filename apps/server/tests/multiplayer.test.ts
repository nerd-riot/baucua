import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import http from 'node:http';
import { Server } from 'socket.io';
import { io as ioc, Socket as ClientSocket } from 'socket.io-client';
import { ClientToServerEvents, ServerToClientEvents, SymbolId } from '@bau-cua/types';
import { RoomManager } from '../src/room-manager.js';

describe('Realtime Multiplayer Server Flow', () => {
  let server: http.Server;
  let io: Server;
  let port: number;
  let roomManager: RoomManager;

  before((_, done) => {
    server = http.createServer();
    io = new Server<ClientToServerEvents, ServerToClientEvents>(server);
    roomManager = new RoomManager();

    io.on('connection', (socket) => {
      let currentRoomId: string | undefined;

      socket.on('guest:login', ({ nickname, avatarId, deviceId }, cb) => {
        const p = roomManager.registerPlayer(socket.id, nickname, avatarId, deviceId);
        cb({ success: true, player: p });
      });

      socket.on('room:create', (opts, cb) => {
        const p = roomManager.getPlayerBySocket(socket.id);
        if (!p) return cb({ success: false, error: 'No player' });
        const room = roomManager.createRoom(p, opts);
        currentRoomId = room.id;
        socket.join(room.id);
        cb({ success: true, room });
      });

      socket.on('room:join', ({ roomIdOrCode }, cb) => {
        const p = roomManager.getPlayerBySocket(socket.id);
        if (!p) return cb({ success: false, error: 'No player' });
        const res = roomManager.joinRoom(p, roomIdOrCode);
        if (res.success && res.room) {
          currentRoomId = res.room.id;
          socket.join(res.room.id);
        }
        cb(res as any);
      });

      socket.on('host:startRound', (cb) => {
        if (!currentRoomId) return cb({ success: false });
        const res = roomManager.startRound(currentRoomId, 10);
        cb(res);
      });

      socket.on('bet:place', (req, cb) => {
        if (!currentRoomId) return cb({ success: false });
        const p = roomManager.getPlayerBySocket(socket.id);
        if (!p) return cb({ success: false });
        const res = roomManager.placeBet(currentRoomId, p.id, req);
        cb(res);
      });
    });

    server.listen(0, () => {
      const addr = server.address();
      if (addr && typeof addr === 'object') {
        port = addr.port;
        done();
      }
    });
  });

  after(() => {
    io.close();
    server.close();
  });

  it('allows Host to create room and Player 2 to join and place a bet', async () => {
    const client1: ClientSocket = ioc(`http://localhost:${port}`);
    const client2: ClientSocket = ioc(`http://localhost:${port}`);

    await new Promise<void>((resolve) => {
      let connected = 0;
      const check = () => {
        connected++;
        if (connected === 2) resolve();
      };
      client1.on('connect', check);
      client2.on('connect', check);
    });

    // 1. Host login
    const hostLoginRes = await new Promise<any>((resolve) => {
      client1.emit('guest:login', { nickname: 'HostPlayer', avatarId: 'char_boy_ao_dai_xanh', deviceId: 'dev_host' }, resolve);
    });
    assert.strictEqual(hostLoginRes.success, true);

    // 2. Player 2 login
    const p2LoginRes = await new Promise<any>((resolve) => {
      client2.emit('guest:login', { nickname: 'PlayerTwo', avatarId: 'char_girl_ao_dai_do', deviceId: 'dev_p2' }, resolve);
    });
    assert.strictEqual(p2LoginRes.success, true);

    // 3. Host creates room
    const createRoomRes = await new Promise<any>((resolve) => {
      client1.emit('room:create', { name: 'Phòng Tết Vui', isPrivate: false }, resolve);
    });
    assert.strictEqual(createRoomRes.success, true);
    const roomCode = createRoomRes.room.code;

    // 4. Player 2 joins room via code
    const joinRes = await new Promise<any>((resolve) => {
      client2.emit('room:join', { roomIdOrCode: roomCode }, resolve);
    });
    assert.strictEqual(joinRes.success, true);
    assert.strictEqual(Object.keys(joinRes.room.players).length, 2);

    // 5. Host starts round
    const startRes = await new Promise<any>((resolve) => {
      client1.emit('host:startRound', resolve);
    });
    assert.strictEqual(startRes.success, true);

    // 6. Player 2 places bet on BAU
    const betRes = await new Promise<any>((resolve) => {
      client2.emit(
        'bet:place',
        {
          clientBetId: 'uuid-bet-1',
          roomId: joinRes.room.id,
          symbol: SymbolId.BAU,
          amount: 200,
        },
        resolve
      );
    });
    assert.strictEqual(betRes.success, true);
    assert.strictEqual(betRes.newBalance, 800); // 1000 - 200 = 800

    client1.disconnect();
    client2.disconnect();
  });
});
