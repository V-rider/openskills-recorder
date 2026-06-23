import Link from "next/link";
import { prisma } from "@openskills/db";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ExportImportDialog } from "@/components/export-import-dialog";

export const dynamic = "force-dynamic";

export default async function SkillsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tag?: string }>;
}) {
  const { q, tag } = await searchParams;
  const skills = await prisma.skill.findMany({
    where: {
      deletedAt: null,
      ...(q ? { OR: [{ name: { contains: q } }, { intent: { contains: q } }] } : {}),
    },
    orderBy: { updatedAt: "desc" },
    include: { versions: { orderBy: { version: "desc" }, take: 1 } },
  });

  const allTags = [...new Set(skills.flatMap((s) => JSON.parse(s.tags) as string[]))].sort();

  const filtered = tag
    ? skills.filter((s) => (JSON.parse(s.tags) as string[]).includes(tag))
    : skills;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Skill Library</h1>
        <div className="flex items-center gap-3">
          <ExportImportDialog />
          <Link href="/recordings/new" className="text-sm font-medium underline">
            New recording
          </Link>
        </div>
      </div>

      <form className="flex gap-2">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search skills..."
          className="h-10 flex-1 rounded-md border px-3 text-sm"
        />
        <button type="submit" className="rounded-md bg-zinc-900 px-4 text-sm text-white">
          Search
        </button>
      </form>

      {allTags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <Link
            href="/skills"
            className={`rounded-full px-3 py-1 text-xs ${!tag ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-700"}`}
          >
            All
          </Link>
          {allTags.map((t) => (
            <Link
              key={t}
              href={`/skills?tag=${encodeURIComponent(t)}`}
              className={`rounded-full px-3 py-1 text-xs ${tag === t ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-700"}`}
            >
              {t}
            </Link>
          ))}
        </div>
      )}

      <div className="grid gap-4">
        {filtered.length === 0 && <p className="text-zinc-500">No skills found.</p>}
        {filtered.map((skill) => (
          <Link key={skill.id} href={`/skills/${skill.id}`}>
            <Card className="transition hover:shadow-md">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{skill.name}</CardTitle>
                  {skill.versions[0] && <Badge>v{skill.versions[0].version}</Badge>}
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-zinc-600">{skill.intent}</p>
                <div className="mt-2 flex gap-1">
                  {(JSON.parse(skill.tags) as string[]).map((t) => (
                    <Badge key={t}>{t}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
