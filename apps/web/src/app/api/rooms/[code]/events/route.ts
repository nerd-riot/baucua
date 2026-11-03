import { getRoomStore } from '@/lib/room-store';

export const dynamic = 'force-dynamic';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const store = getRoomStore();
  const room = store.getRoom(code);

  if (!room) {
    return new Response('Room not found', { status: 404 });
  }

  const roomId = room.id;
  const encoder = new TextEncoder();

  let unsubscribe: (() => void) | undefined;

  const stream = new ReadableStream({
    start(controller) {
      // Send initial heartbeat
      controller.enqueue(encoder.encode(`event: ping\ndata: ${Date.now()}\n\n`));

      // Register listener for room events
      unsubscribe = store.subscribe(roomId, ({ event, payload }) => {
        try {
          const message = `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;
          controller.enqueue(encoder.encode(message));
        } catch {
          // stream might be closed
        }
      });
    },
    cancel() {
      if (unsubscribe) unsubscribe();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
