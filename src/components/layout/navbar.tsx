"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { UserButton } from "@/components/auth/user-button";
import { cn } from "@/lib/utils";
import { Menu, X } from "lucide-react";

const publicLinks = [
  { href: "/", label: "Inicio" },
  { href: "/grupos", label: "Grupos" },
  { href: "/resultados", label: "Resultados" },
  { href: "/tabla", label: "Leaderboard" },
];

// Links shown to regular (non-liga) authenticated users
const generalAuthLinks = [
  { href: "/predicciones", label: "Predicciones" },
  { href: "/sub-quinielas", label: "Mis Grupos" },
  { href: "/paquetes", label: "Paquetes" },
  { href: "/regalar", label: "Regalar" },
];

// Liga members: only need predicciones (their liga quiniela)
const ligaMemberLinks = [
  { href: "/predicciones", label: "Predicciones" },
];

// Liga owners: only admin link (they do not play)
const ligaOwnerLinks = [
  { href: "/liga-admin", label: "Panel de mi Liga" },
];

export function Navbar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isLigaOwner, setIsLigaOwner] = useState(false);
  const [isLigaMember, setIsLigaMember] = useState(false);

  useEffect(() => {
    if (!session?.user?.email) {
      setIsLigaOwner(false);
      setIsLigaMember(false);
      return;
    }
    fetch(`/api/users/check-profile?email=${encodeURIComponent(session.user.email)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        setIsLigaOwner(!!d?.isLigaOwner);
        setIsLigaMember(!!d?.isLigaMember);
      })
      .catch(() => {});
  }, [session?.user?.email]);

  let authLinks = generalAuthLinks;
  if (isLigaOwner) authLinks = ligaOwnerLinks;
  else if (isLigaMember) authLinks = ligaMemberLinks;

  const links = session ? [...publicLinks, ...authLinks] : publicLinks;

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 flex h-14 items-center">
        <Link href="/" className="mr-6 flex items-center space-x-2">
          <span className="text-lg font-bold">Quiniela 2026</span>
        </Link>

        {/* Desktop nav */}
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
          {/* Mobile hamburger */}
          <button
            className="md:hidden p-1.5 rounded-md hover:bg-accent"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <nav className="md:hidden border-t bg-background px-4 pb-4 pt-2 space-y-1">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "block rounded-md px-3 py-2 text-sm font-medium transition-colors",
                pathname === link.href
                  ? "bg-accent text-foreground"
                  : "text-foreground/60 hover:bg-accent hover:text-foreground"
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
