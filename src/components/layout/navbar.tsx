"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { UserButton } from "@/components/auth/user-button";
import { cn } from "@/lib/utils";

const publicLinks = [
  { href: "/", label: "Inicio" },
  { href: "/grupos", label: "Grupos" },
  { href: "/resultados", label: "Resultados" },
  { href: "/tabla", label: "Tabla" },
];

const authLinks = [
  { href: "/predicciones", label: "Predicciones" },
  { href: "/recargas", label: "Recargas" },
];

export function Navbar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  const links = session ? [...publicLinks, ...authLinks] : publicLinks;

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <Link href="/" className="mr-6 flex items-center space-x-2">
          <span className="text-lg font-bold">Quiniela 2026</span>
        </Link>

        <nav className="hidden md:flex items-center space-x-6 text-sm font-medium">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "transition-colors hover:text-foreground/80",
                pathname === link.href
                  ? "text-foreground"
                  : "text-foreground/60"
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center space-x-4">
          <UserButton />
        </div>
      </div>
    </header>
  );
}
