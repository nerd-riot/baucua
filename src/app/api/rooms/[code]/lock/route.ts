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

    const result = store.lockAndRoll(room.id);
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      diceResult: result.diceResult,
      settlements: result.settlements,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Khóa cược thất bại';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
