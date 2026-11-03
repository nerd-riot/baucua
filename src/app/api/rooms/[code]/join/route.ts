import { NextResponse } from 'next/server';
import { getRoomStore } from '@/lib/room-store';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const body = await req.json();
    const { deviceId, nickname, avatarId, passcode } = body;

    const store = getRoomStore();
    const player = store.registerPlayer(
      deviceId || 'dev_guest',
      nickname || 'Người Chơi',
      avatarId || 'char_boy_ao_dai_xanh'
    );

    const result = store.joinRoom(player, code, passcode);
    if (!result.success || !result.room) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      room: result.room,
      player,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Vào phòng thất bại';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
