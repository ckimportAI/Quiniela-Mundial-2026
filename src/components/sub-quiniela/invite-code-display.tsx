"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

interface InviteCodeDisplayProps {
  code: string;
}

export function InviteCodeDisplay({ code }: InviteCodeDisplayProps) {
  const [copied, setCopied] = useState(false);

  const copyCode = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const copyLink = async () => {
    const url = `${window.location.origin}/sub-quinielas/unirse/${code}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <code className="bg-muted px-3 py-1.5 rounded-md text-lg font-mono font-bold tracking-widest">
          {code}
        </code>
        <Button variant="ghost" size="icon" onClick={copyCode} title="Copiar codigo">
          {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
        </Button>
      </div>
      <Button variant="outline" size="sm" onClick={copyLink} className="w-fit text-xs">
        Copiar link de invitacion
      </Button>
    </div>
  );
}
