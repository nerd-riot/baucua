import { describe, it } from 'node:test';
import assert from 'node:assert';
import { SymbolId } from '../src/types';
import { getRoomStore } from '../src/lib/room-store';

describe('Vercel-Native RoomStore Logic', () => {
  it('creates and registers a guest player', () => {
    const store = getRoomStore();
    const player = store.registerPlayer('dev_test_1', 'Khoa Test', 'char_boy_ao_dai_xanh');
    assert.strictEqual(player.nickname, 'Khoa Test');
    assert.strictEqual(player.avatarId, 'char_boy_ao_dai_xanh');
    assert.strictEqual(player.points, 1000);
  });

  it('creates a room and assigns host', () => {
    const store = getRoomStore();
    const host = store.registerPlayer('dev_host_1', 'Host Khoa', 'char_boy_ao_dai_xanh');
    const room = store.createRoom(host, {
      name: 'Phòng Vercel',
      isPrivate: false,
      maxPlayers: 30,
    });

    assert.strictEqual(room.name, 'Phòng Vercel');
    assert.strictEqual(room.hostId, host.id);
    assert.strictEqual(room.code.length, 6);
    assert.strictEqual(room.currentRound.state, 'WAITING');
    assert.strictEqual(room.players[host.id].isHost, true);
  });

  it('allows players to join and enforces max capacity', () => {
    const store = getRoomStore();
    const host = store.registerPlayer('dev_h2', 'Host 2', 'char_boy_ao_dai_xanh');
    const room = store.createRoom(host, { name: 'Cap Room', isPrivate: false, maxPlayers: 2 });

    const p2 = store.registerPlayer('dev_p2', 'Player 2', 'char_girl_ao_dai_do');
    const j2 = store.joinRoom(p2, room.code);
    assert.strictEqual(j2.success, true);

    const p3 = store.registerPlayer('dev_p3', 'Player 3', 'char_boy_ao_ba_ba_nau');
    const j3 = store.joinRoom(p3, room.code);
    assert.strictEqual(j3.success, false);
    assert.match(j3.error || '', /số lượng/);
  });

  it('handles host migration when host leaves', () => {
    const store = getRoomStore();
    const host = store.registerPlayer('dev_h3', 'Host 3', 'char_boy_ao_dai_xanh');
    const room = store.createRoom(host, { name: 'Migrate Room', isPrivate: false });

    const p2 = store.registerPlayer('dev_p4', 'Player 4', 'char_girl_ao_dai_do');
    store.joinRoom(p2, room.code);

    const { room: updatedRoom, newHostId } = store.leaveRoom(host.id, room.id);
    assert(updatedRoom);
    assert.strictEqual(newHostId, p2.id);
    assert.strictEqual(updatedRoom.hostId, p2.id);
    assert.strictEqual(updatedRoom.players[p2.id].isHost, true);
  });

  it('completes round betting, placement, and settlement with correct economy', async () => {
    const store = getRoomStore();
    const host = store.registerPlayer('dev_h4', 'Host 4', 'char_boy_ao_dai_xanh');
    const room = store.createRoom(host, { name: 'Econ Room', isPrivate: false });

    const p2 = store.registerPlayer('dev_p5', 'Player 5', 'char_girl_ao_dai_do');
    store.joinRoom(p2, room.code);

    // 1. Host starts round
    const startRes = store.startRound(room.id, 20);
    assert.strictEqual(startRes.success, true);
    assert.strictEqual(room.currentRound.state, 'BETTING');

    // 2. Player 2 places bet on BAU
    const betRes = store.placeBet(room.id, p2.id, {
      roomId: room.id,
      symbol: SymbolId.BAU,
      amount: 100,
      clientBetId: 'client_bet_test_1',
    });
    assert.strictEqual(betRes.success, true);
    assert.strictEqual(betRes.newBalance, 900);
    assert.strictEqual(room.players[p2.id].points, 900);

    // 3. Lock & roll (0ms wait in tests)
    const rollRes = await store.lockAndRoll(room.id, 0);
    assert.strictEqual(rollRes.success, true);
    assert(rollRes.diceResult);
    assert.strictEqual(rollRes.diceResult.length, 3);
    assert.strictEqual(room.currentRound.state, 'REVEALED');
  });
});
