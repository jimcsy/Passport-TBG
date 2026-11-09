import "server-only";
import { PrismaClient, type Prisma } from "@prisma/client";

// The normal development client logs query parameters, including JSON cache
// writes. Keep this feature quiet even in development and share its small pool.
const globalForTips = globalThis as unknown as { strobiTipsDb?: PrismaClient };
function datasource(): Pick<Prisma.PrismaClientOptions, "datasources"> {
  if (!process.env.DATABASE_URL) return {};
  try {
    const url = new URL(process.env.DATABASE_URL);
    if (!url.searchParams.has("connection_limit")) url.searchParams.set("connection_limit", "2");
    return { datasources: { db: { url: url.toString() } } };
  } catch { return {}; } // Prisma reports invalid configuration at use; service fails closed.
}
export const strobiTipsDb = globalForTips.strobiTipsDb ?? new PrismaClient({ ...datasource(), log: [] });
if (process.env.NODE_ENV !== "production") globalForTips.strobiTipsDb = strobiTipsDb;
