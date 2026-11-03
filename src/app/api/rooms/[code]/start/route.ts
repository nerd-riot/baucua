import { NextResponse } from 'next/server';
import { getRoomStore } from '@/lib/room-store';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const store = getRoomStore();
    const room = store.getRoom(code);

    if (!room) {
      return NextResponse.json({ success: false, error: 'Phòng không tồn tại' }, { status: 404 });
    }

    const result = store.startRound(room.id, 25);
    if (!result.success || !result.round) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, round: result.round });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Bắt đầu ván thất bại';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
