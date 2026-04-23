import { prisma } from "@/lib/prisma";

export const CONFIG_KEYS = {
  SHOW_POOL_HOME: "show_pool_home",
} as const;

export type ConfigKey = (typeof CONFIG_KEYS)[keyof typeof CONFIG_KEYS];

const DEFAULTS: Record<ConfigKey, string> = {
  show_pool_home: "false",
};

export async function getConfig(key: ConfigKey): Promise<string> {
  const row = await prisma.siteConfig.findUnique({ where: { key } });
  return row?.value ?? DEFAULTS[key];
}

export async function getBooleanConfig(key: ConfigKey): Promise<boolean> {
  const v = await getConfig(key);
  return v === "true";
}

export async function setConfig(key: ConfigKey, value: string, userId?: string) {
  await prisma.siteConfig.upsert({
    where: { key },
    update: { value, updatedBy: userId ?? null },
    create: { key, value, updatedBy: userId ?? null },
  });
}

export async function getAllConfig(): Promise<Record<string, string>> {
  const rows = await prisma.siteConfig.findMany();
  const map: Record<string, string> = { ...DEFAULTS };
  for (const r of rows) map[r.key] = r.value;
  return map;
}
