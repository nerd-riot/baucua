import { NextResponse } from 'next/server';
import { getRoomStore } from '@/lib/room-store';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const body = await req.json();
    const { playerId } = body;

    const store = getRoomStore();
    const room = store.getRoom(code);
    if (!room) {
      return NextResponse.json({ success: true });
    }

    store.leaveRoom(playerId, room.id);
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Rời phòng thất bại';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
