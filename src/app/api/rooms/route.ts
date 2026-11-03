import { NextResponse } from 'next/server';
import { getRoomStore } from '@/lib/room-store';

export async function GET() {
  const store = getRoomStore();
  return NextResponse.json({ success: true, rooms: store.listPublicRooms() });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, isPrivate, passcode, maxPlayers, deviceId, nickname, avatarId } = body;

    const store = getRoomStore();
    const creator = store.registerPlayer(
      deviceId || 'dev_guest',
      nickname || 'Chủ Phòng',
      avatarId || 'char_boy_ao_dai_xanh'
    );

    const room = store.createRoom(creator, {
      name: name || 'Phòng Hội Xuân',
      isPrivate: !!isPrivate,
      passcode,
      maxPlayers: maxPlayers || 30,
    });

    return NextResponse.json({ success: true, room, player: creator });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Tạo phòng thất bại';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
