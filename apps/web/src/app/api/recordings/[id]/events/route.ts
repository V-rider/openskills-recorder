import { subscribeRecordingEvents, type RawRecordingEvent } from "@openskills/core";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const cleanups = new Map<ReadableStreamDefaultController, () => void>();

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      const send = (data: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      send({ type: "connected", recordingId: id });

      const unsubscribe = subscribeRecordingEvents(id, (event: RawRecordingEvent) => {
        send({ type: "recording:event", recordingId: id, event });
      });

      const heartbeat = setInterval(() => {
        controller.enqueue(encoder.encode(": heartbeat\n\n"));
      }, 15000);

      cleanups.set(controller, () => {
        clearInterval(heartbeat);
        unsubscribe();
        cleanups.delete(controller);
      });
    },
    cancel(controller) {
      cleanups.get(controller)?.();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
