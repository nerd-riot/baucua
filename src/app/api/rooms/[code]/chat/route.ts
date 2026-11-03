import { NextResponse } from 'next/server';
import { getRoomStore } from '@/lib/room-store';
import { ChatMessage } from '@/types';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const body = await req.json();
    const { playerId, text, stickerId } = body;

    const store = getRoomStore();
    const room = store.getRoom(code);

    if (!room) {
      return NextResponse.json({ success: false, error: 'Phòng không tồn tại' }, { status: 404 });
    }

    const player = room.players[playerId];
    const message: ChatMessage = {
      id: 'msg_' + crypto.randomUUID().slice(0, 8),
      senderId: playerId,
      senderNickname: player ? player.nickname : 'Người Chơi',
      avatarId: player ? player.avatarId : 'char_boy_ao_dai_xanh',
      text: text?.slice(0, 100),
      stickerId,
      timestamp: Date.now(),
    };

    store.addChatMessage(room.id, message);
    return NextResponse.json({ success: true, message });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Gửi tin nhắn thất bại';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
