import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@openskills/db";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function RecordingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const recording = await prisma.recording.findUnique({
    where: { id },
    include: { events: { orderBy: { sequence: "asc" } }, skill: true },
  });
  if (!recording) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{recording.name}</h1>
          <p className="text-zinc-600">{recording.intent}</p>
        </div>
        <Badge>{recording.status}</Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Events ({recording.events.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {recording.events.map((e) => (
            <div key={e.id} className="rounded border p-2 text-sm">
              <span className="font-mono text-zinc-500">#{e.sequence}</span> {e.type}
            </div>
          ))}
        </CardContent>
      </Card>

      {recording.skill && (
        <Button asChild>
          <Link href={`/skills/${recording.skill.id}`}>View skill</Link>
        </Button>
      )}
    </div>
  );
}
