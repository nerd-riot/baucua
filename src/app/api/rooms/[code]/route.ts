import { NextResponse } from 'next/server';
import { getRoomStore } from '@/lib/room-store';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const store = getRoomStore();
  const room = store.getRoom(code);

  if (!room) {
    return NextResponse.json({ success: false, error: 'Không tìm thấy phòng' }, { status: 404 });
  }

  const boardSummary = store.getBoardSummary(room.id);
  const chatMessages = store.getChatMessages(room.id);

  return NextResponse.json({
    success: true,
    room,
    boardSummary,
    chatMessages,
  });
}
