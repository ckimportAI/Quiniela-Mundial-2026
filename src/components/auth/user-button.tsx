"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function UserButton() {
  const { data: session } = useSession();

  if (!session?.user) {
    return (
      <Button asChild variant="outline" size="sm">
        <Link href="/login">Iniciar Sesion</Link>
      </Button>
    );
  }

  const displayName = session.user.nickname ?? session.user.name ?? session.user.email;
  const initials = (session.user.nickname ?? session.user.name)
    ?.split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) ?? "??";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-9 w-9 rounded-full">
          <Avatar className="h-9 w-9">
            <AvatarImage
              src={session.user.image ?? undefined}
              alt={session.user.name ?? ""}
            />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <div className="flex items-center justify-start gap-2 p-2">
          <div className="flex flex-col space-y-1 leading-none">
            <p className="font-medium">{displayName}</p>
            {session.user.email && (
              <p className="w-[200px] truncate text-xs text-muted-foreground">
                {session.user.email}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Creditos: <span className="font-semibold">{session.user.credits ?? 0}</span>
            </p>
          </div>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/perfil">Mi Perfil</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/predicciones">Predicciones</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/paquetes">Comprar Quinielas</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/tabla">Leaderboard</Link>
        </DropdownMenuItem>
        {session.user.role === "ADMIN" && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/admin">Panel Admin</Link>
            </DropdownMenuItem>
          </>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="cursor-pointer"
          onSelect={() => signOut({ callbackUrl: "/" })}
        >
          Cerrar Sesion
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
