import { describe, it } from 'node:test';
import assert from 'node:assert';
import { Player, SymbolId } from '@bau-cua/types';
import { RoomManager } from '../src/room-manager.js';

describe('RoomManager Authoritative Server Logic', () => {
  it('creates and registers a guest player', () => {
    const rm = new RoomManager();
    const player = rm.registerPlayer('socket_1', 'Khoa', 'char_boy_ao_dai_xanh', 'device_khoa_1');
    assert.strictEqual(player.nickname, 'Khoa');
    assert.strictEqual(player.avatarId, 'char_boy_ao_dai_xanh');
    assert.strictEqual(player.points, 1000);
  });

  it('creates a room, assigns host and generates 6-char code', () => {
    const rm = new RoomManager();
    const host = rm.registerPlayer('s_host', 'HostKhoa', 'char_boy_ao_dai_xanh', 'dev_host');
    const room = rm.createRoom(host, {
      name: 'Phòng Tết Vui',
      isPrivate: false,
      maxPlayers: 30,
    });

    assert.strictEqual(room.name, 'Phòng Tết Vui');
    assert.strictEqual(room.hostId, host.id);
    assert.strictEqual(room.code.length, 6);
    assert.strictEqual(room.currentRound.state, 'WAITING');
    assert.strictEqual(room.players[host.id].isHost, true);
  });

  it('allows players to join and enforces 30 max capacity', () => {
    const rm = new RoomManager();
    const host = rm.registerPlayer('s_h', 'Host', 'char_boy_ao_dai_xanh', 'd_h');
    const room = rm.createRoom(host, { name: 'Small Room', isPrivate: false, maxPlayers: 2 });

    const p2 = rm.registerPlayer('s_2', 'Player2', 'char_girl_ao_dai_do', 'd_2');
    const j2 = rm.joinRoom(p2, room.code);
    assert.strictEqual(j2.success, true);
    assert.strictEqual(Object.keys(room.players).length, 2);

    const p3 = rm.registerPlayer('s_3', 'Player3', 'char_boy_ao_ba_ba_nau', 'd_3');
    const j3 = rm.joinRoom(p3, room.code);
    assert.strictEqual(j3.success, false);
    assert.match(j3.error || '', /số lượng/);
  });

  it('handles host migration when host leaves room', () => {
    const rm = new RoomManager();
    const host = rm.registerPlayer('s_h', 'Host', 'char_boy_ao_dai_xanh', 'd_h');
    const room = rm.createRoom(host, { name: 'Migration Room', isPrivate: false });

    const p2 = rm.registerPlayer('s_2', 'Player2', 'char_girl_ao_dai_do', 'd_2');
    rm.joinRoom(p2, room.code);

    const { room: updatedRoom, newHostId } = rm.leaveRoom(host.id, room.id);
    assert(updatedRoom);
    assert.strictEqual(newHostId, p2.id);
    assert.strictEqual(updatedRoom.hostId, p2.id);
    assert.strictEqual(updatedRoom.players[p2.id].isHost, true);
  });

  it('completes full round lifecycle: betting, placement, and settlement', () => {
    const rm = new RoomManager();
    const host = rm.registerPlayer('s_h', 'Host', 'char_boy_ao_dai_xanh', 'd_h');
    const room = rm.createRoom(host, { name: 'Full Game Room', isPrivate: false });

    const p2 = rm.registerPlayer('s_2', 'Player2', 'char_girl_ao_dai_do', 'd_2');
    rm.joinRoom(p2, room.code);

    // 1. Host starts round
    const startRes = rm.startRound(room.id, 20);
    assert.strictEqual(startRes.success, true);
    assert.strictEqual(room.currentRound.state, 'BETTING');

    // 2. Player 2 places bet on BAU
    const betRes = rm.placeBet(room.id, p2.id, {
      roomId: room.id,
      symbol: SymbolId.BAU,
      amount: 100,
      clientBetId: 'client_bet_uuid_1',
    });
    assert.strictEqual(betRes.success, true);
    assert.strictEqual(betRes.newBalance, 900); // 1000 - 100
    assert.strictEqual(room.players[p2.id].points, 900);

    // 3. Board summary reflects bet
    const summary = rm.getBoardSummary(room.id);
    const bauSummary = summary.find((s) => s.symbol === SymbolId.BAU);
    assert.strictEqual(bauSummary?.totalAmount, 100);

    // 4. Settle round
    const outcome = rm.rollAndSettle(room.id);
    assert.strictEqual(outcome.success, true);
    assert(outcome.diceResult);
    assert.strictEqual(outcome.diceResult.length, 3);
    assert.strictEqual(room.currentRound.state, 'REVEALED');
    assert.strictEqual(room.roundHistory.length, 1);
  });
});
