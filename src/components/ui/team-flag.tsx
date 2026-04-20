/* eslint-disable @next/next/no-img-element */

// Maps FIFA/IOC team codes to ISO 3166-1 alpha-2 codes for flag images
const CODE_TO_ISO: Record<string, string> = {
  MEX: "mx", RSA: "za", KOR: "kr", CZE: "cz",
  CAN: "ca", BIH: "ba", QAT: "qa", SUI: "ch",
  BRA: "br", MAR: "ma", HAI: "ht", SCO: "gb-sct",
  USA: "us", PAR: "py", AUS: "au", TUR: "tr",
  GER: "de", CUW: "cw", CIV: "ci", ECU: "ec",
  NED: "nl", JPN: "jp", SWE: "se", TUN: "tn",
  BEL: "be", EGY: "eg", IRN: "ir", NZL: "nz",
  ESP: "es", CPV: "cv", KSA: "sa", URU: "uy",
  FRA: "fr", SEN: "sn", IRQ: "iq", NOR: "no",
  ARG: "ar", ALG: "dz", AUT: "at", JOR: "jo",
  POR: "pt", COD: "cd", UZB: "uz", COL: "co",
  ENG: "gb-eng", CRO: "hr", GHA: "gh", PAN: "pa",
};

interface TeamFlagProps {
  code: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function TeamFlag({ code, size = "md", className = "" }: TeamFlagProps) {
  const iso = CODE_TO_ISO[code];
  const sizeMap = { sm: 16, md: 24, lg: 32 };
  const px = sizeMap[size];

  if (!iso) {
    return <span className={`inline-block ${className}`} style={{ width: px, height: px }}>🏳️</span>;
  }

  return (
    <img
      src={`https://flagcdn.com/${px * 2 > 40 ? "w80" : "w40"}/${iso}.png`}
      alt={code}
      width={px}
      height={Math.round(px * 0.75)}
      className={`inline-block rounded-sm object-cover border border-border/50 ${className}`}
      style={{ width: px, height: Math.round(px * 0.75) }}
      loading="lazy"
    />
  );
}
