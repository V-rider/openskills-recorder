import Link from "next/link";
import { prisma } from "@openskills/db";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [recordings, skills] = await Promise.all([
    prisma.recording.findMany({ orderBy: { createdAt: "desc" }, take: 5 }),
    prisma.skill.findMany({ where: { deletedAt: null }, orderBy: { updatedAt: "desc" }, take: 5 }),
  ]);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">OpenSkills Recorder</h1>
          <p className="mt-2 text-zinc-600">
            Record a workflow once, synthesize a reusable skill, replay with variable inputs.
          </p>
        </div>
        <Button asChild>
          <Link href="/recordings/new">New Recording</Link>
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent recordings</CardTitle>
            <CardDescription>Captured browser workflows</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {recordings.length === 0 && <p className="text-sm text-zinc-500">No recordings yet.</p>}
            {recordings.map((r) => (
              <Link key={r.id} href={`/recordings/${r.id}`} className="block rounded-lg border p-3 hover:bg-zinc-50 dark:hover:bg-zinc-900">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{r.name}</span>
                  <Badge>{r.status}</Badge>
                </div>
                <p className="text-sm text-zinc-500">{r.intent}</p>
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Skill library</CardTitle>
            <CardDescription>Reusable automation skills</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {skills.length === 0 && <p className="text-sm text-zinc-500">No skills synthesized yet.</p>}
            {skills.map((s) => (
              <Link key={s.id} href={`/skills/${s.id}`} className="block rounded-lg border p-3 hover:bg-zinc-50 dark:hover:bg-zinc-900">
                <span className="font-medium">{s.name}</span>
                <p className="text-sm text-zinc-500">{s.intent}</p>
              </Link>
            ))}
            <Button variant="outline" asChild className="w-full">
              <Link href="/skills">View all skills</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
