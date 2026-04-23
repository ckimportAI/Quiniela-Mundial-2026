import Link from "next/link";
import { CONTACT_EMAIL } from "@/lib/constants";

export function Footer() {
  return (
    <footer className="border-t bg-background/95 mt-12">
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-muted-foreground">
          <p>
            &copy; 2026 QuinielaPanas &middot; Hecho en Venezuela{" "}
            <span aria-label="Venezuela">🇻🇪</span>
          </p>
          <nav className="flex items-center gap-4">
            <Link
              href="/terminos"
              className="hover:text-foreground transition-colors"
            >
              Terminos
            </Link>
            <Link
              href="/privacidad"
              className="hover:text-foreground transition-colors"
            >
              Privacidad
            </Link>
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="hover:text-foreground transition-colors"
            >
              Contacto
            </a>
          </nav>
        </div>
      </div>
    </footer>
  );
}
