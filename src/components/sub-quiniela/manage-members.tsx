"use client";

import { useState } from "react";
import { UserMinus, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface Member {
  id: string;
  userId: string;
  role: string;
  user: {
    id: string;
    name: string | null;
    nickname: string | null;
  };
  quiniela: {
    name: string;
  };
}

interface ManageMembersProps {
  members: Member[];
  subQuinielaId: string;
  onMemberRemoved: () => void;
}

export function ManageMembers({
  members,
  subQuinielaId,
  onMemberRemoved,
}: ManageMembersProps) {
  const [removing, setRemoving] = useState<string | null>(null);

  const handleRemove = async (memberId: string, nickname: string | null) => {
    if (!confirm(`Expulsar a ${nickname ?? "este miembro"}?`)) return;
    setRemoving(memberId);

    try {
      const res = await fetch(
        `/api/sub-quinielas/${subQuinielaId}/members/${memberId}`,
        { method: "DELETE" }
      );
      if (res.ok) {
        onMemberRemoved();
      } else {
        const data = await res.json();
        alert(data.error ?? "Error al expulsar");
      }
    } catch {
      alert("Error de conexion");
    } finally {
      setRemoving(null);
    }
  };

  return (
    <div className="space-y-2">
      {members.map((member) => (
        <div
          key={member.id}
          className="flex items-center justify-between rounded-md border px-3 py-2"
        >
          <div className="flex items-center gap-2">
            <span className="font-medium">
              {member.user.nickname ?? member.user.name ?? "Sin nombre"}
            </span>
            {member.role === "ADMIN" && (
              <Badge variant="secondary" className="text-xs">
                <Crown className="h-3 w-3 mr-1" />
                Admin
              </Badge>
            )}
            <span className="text-xs text-muted-foreground">
              ({member.quiniela.name})
            </span>
          </div>

          {member.role !== "ADMIN" && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleRemove(member.id, member.user.nickname)}
              disabled={removing === member.id}
              title="Expulsar"
            >
              <UserMinus className="h-4 w-4 text-destructive" />
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}
