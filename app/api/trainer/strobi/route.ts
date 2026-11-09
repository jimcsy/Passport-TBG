import { getAdminSession } from "@/lib/auth/session";
import { generateStrobiProposal } from "@/lib/ai/strobi-service";
import type { StrobiResult } from "@/lib/ai/strobi-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function reply(result: StrobiResult) {
  const status = result.success ? 200 : result.code === "UNAUTHORIZED" ? 401 :
    result.code === "INVALID_INPUT" ? 400 : result.code === "INACCESSIBLE_PLAN" ? 404 :
    ["DAILY_LIMIT", "BUSY", "PROVIDER_QUOTA"].includes(result.code) ? 429 :
    result.code === "CANCELLED" ? 499 : result.code === "TIMEOUT" ? 504 : 503;
  return Response.json(result, { status, headers: { "Cache-Control": "no-store" } });
}

/** Fetch endpoint allows the client to cancel via AbortController in phase 3. */
export async function POST(request: Request) {
  if (!await getAdminSession()) return reply({ success: false, code: "UNAUTHORIZED" });
  // Fetch from the same-origin form only; reject cross-site cookie-based requests.
  if (request.headers.get("origin") !== new URL(request.url).origin) return new Response(null, { status: 403 });
  if (!request.headers.get("content-type")?.startsWith("application/json")) return reply({ success: false, code: "INVALID_INPUT" });
  if (!request.body) return reply({ success: false, code: "INVALID_INPUT" });
  const reader = request.body.getReader(); let size = 0; const chunks: Uint8Array[] = [];
  let input: unknown;
  try {
    while (true) {
      const { value, done } = await reader.read(); if (done) break;
      size += value.byteLength;
      if (size > 16_384) return reply({ success: false, code: "INVALID_INPUT" });
      chunks.push(value);
    }
    input = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch { return reply({ success: false, code: "INVALID_INPUT" }); }
  finally { await reader.cancel().catch(() => undefined); }
  return reply(await generateStrobiProposal(input, request.signal));
}
