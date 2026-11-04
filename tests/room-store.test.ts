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

    // Verify zero-sum economy between Host (Nhà Cái) and Player 2
    // Both started at 1000 (total 2000). After settlement, host + p2 points must equal 2000!
    assert.strictEqual(room.players[host.id].points + room.players[p2.id].points, 2000);
  });

  it('prevents host from betting in player-dealer room, and allows creator to bet in bot-dealer room', () => {
    const store = getRoomStore();
    const host = store.registerPlayer('dev_h_mode', 'Host Mode', 'char_boy_ao_dai_xanh');
    const playerDealerRoom = store.createRoom(host, {
      name: 'Player Dealer Room',
      isPrivate: false,
      dealerType: 'player',
    });
    store.startRound(playerDealerRoom.id, 20);

    // Host cannot bet when host is dealer
    const hostBet = store.placeBet(playerDealerRoom.id, host.id, {
      roomId: playerDealerRoom.id,
      symbol: SymbolId.BAU,
      amount: 50,
      clientBetId: 'host_self_bet_1',
    });
    assert.strictEqual(hostBet.success, false);

    // Creator CAN bet when room is created with Bot as dealer
    const creator = store.registerPlayer('dev_c_bot', 'Creator Bot Room', 'char_girl_ao_dai_do');
    const botDealerRoom = store.createRoom(creator, {
      name: 'Bot Dealer Room',
      isPrivate: false,
      dealerType: 'bot',
    });
    assert.strictEqual(botDealerRoom.dealerType, 'bot');
    store.startRound(botDealerRoom.id, 20);

    const creatorBet = store.placeBet(botDealerRoom.id, creator.id, {
      roomId: botDealerRoom.id,
      symbol: SymbolId.CUA,
      amount: 100,
      clientBetId: 'creator_bot_bet_1',
    });
    assert.strictEqual(creatorBet.success, true);
    assert.strictEqual(creatorBet.newBalance, 900);
  });

  it('provides a permanent default Bot room (BAUCUA) that persists after players leave', () => {
    const store = getRoomStore();
    const defaultRoom = store.getRoom('BAUCUA');
    assert(defaultRoom);
    assert.strictEqual(defaultRoom.dealerType, 'bot');
    assert.strictEqual(defaultRoom.isDefault, true);

    const p = store.registerPlayer('dev_join_def', 'Joiner', 'char_boy_ao_dai_xanh');
    const joinRes = store.joinRoom(p, 'BAUCUA');
    assert.strictEqual(joinRes.success, true);

    const leaveRes = store.leaveRoom(p.id, defaultRoom.id);
    assert.strictEqual(leaveRes.roomDeleted, false);
    assert(store.getRoom('BAUCUA'));
  });

  it('allows players to withdraw/cancel bets per symbol or all symbols during BETTING', () => {
    const store = getRoomStore();
    const creator = store.registerPlayer('dev_cancel_1', 'Cancel Tester', 'char_boy_ao_dai_xanh');
    const room = store.createRoom(creator, {
      name: 'Cancel Bet Room',
      isPrivate: false,
      dealerType: 'bot',
    });

    store.startRound(room.id, 20);
    store.placeBet(room.id, creator.id, {
      roomId: room.id,
      symbol: SymbolId.BAU,
      amount: 100,
      clientBetId: 'cb_1',
    });
    store.placeBet(room.id, creator.id, {
      roomId: room.id,
      symbol: SymbolId.CUA,
      amount: 200,
      clientBetId: 'cb_2',
    });
    assert.strictEqual(room.players[creator.id].points, 700);

    // Withdraw only BAU (100 pts)
    const cancelBau = store.cancelBets(room.id, creator.id, SymbolId.BAU);
    assert.strictEqual(cancelBau.success, true);
    assert.strictEqual(cancelBau.refundedAmount, 100);
    assert.strictEqual(cancelBau.newBalance, 800);

    // Withdraw remaining bets (CUA: 200 pts)
    const cancelAll = store.cancelBets(room.id, creator.id);
    assert.strictEqual(cancelAll.success, true);
    assert.strictEqual(cancelAll.refundedAmount, 200);
    assert.strictEqual(cancelAll.newBalance, 1000);
    assert.strictEqual(room.players[creator.id].points, 1000);
  });
});
