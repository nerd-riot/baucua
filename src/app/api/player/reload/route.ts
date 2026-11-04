import { NextResponse } from 'next/server';
import { getRoomStore } from '@/lib/room-store';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { deviceId } = body;

    const store = getRoomStore();
    const newBalance = store.reloadPlayerPoints(deviceId || 'dev_guest', 1000);

    return NextResponse.json({ success: true, newBalance });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Nạp điểm thất bại';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
