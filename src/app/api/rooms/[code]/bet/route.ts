import { NextResponse } from 'next/server';
import { getRoomStore } from '@/lib/room-store';
import { SymbolId } from '@/types';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const body = await req.json();
    const { playerId, symbol, amount, clientBetId } = body;

    const store = getRoomStore();
    const room = store.getRoom(code);

    if (!room) {
      return NextResponse.json({ success: false, error: 'Phòng không tồn tại' }, { status: 404 });
    }

    const result = store.placeBet(room.id, playerId, {
      roomId: room.id,
      symbol: symbol as SymbolId,
      amount: Number(amount),
      clientBetId: clientBetId || crypto.randomUUID(),
    });

    if (!result.success || !result.bet) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      bet: result.bet,
      newBalance: result.newBalance,
      boardSummary: result.boardSummary,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Đặt cược thất bại';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const body = await req.json();
    const { playerId, symbol } = body;

    const store = getRoomStore();
    const room = store.getRoom(code);

    if (!room) {
      return NextResponse.json({ success: false, error: 'Phòng không tồn tại' }, { status: 404 });
    }

    const result = store.cancelBets(
      room.id,
      playerId,
      symbol ? (symbol as SymbolId) : undefined
    );

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      refundedAmount: result.refundedAmount,
      newBalance: result.newBalance,
      boardSummary: result.boardSummary,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Hủy cược thất bại';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
