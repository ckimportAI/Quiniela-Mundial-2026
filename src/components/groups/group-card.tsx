import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { TeamFlag } from "@/components/ui/team-flag";
import type { GroupWithTeams } from "@/lib/types";

interface GroupCardProps {
  group: GroupWithTeams;
}

export function GroupCard({ group }: GroupCardProps) {
  return (
    <Link href={`/grupos/${group.id}`}>
      <Card className="hover:border-primary/50 transition-colors cursor-pointer">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Grupo {group.name}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {group.teams.map((team) => (
              <div
                key={team.id}
                className="flex items-center gap-2 text-sm"
              >
                <TeamFlag code={team.code} size="md" />
                <span>{team.name}</span>
                <span className="text-xs text-muted-foreground ml-auto">
                  {team.code}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
