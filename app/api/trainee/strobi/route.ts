import { getTraineeSession } from "@/lib/auth/session";
import { generateStrobiTip } from "@/lib/ai/strobi-tips-service";
import { strobiTipRequestSchema, strobiTipResultSchema, type StrobiTipResult } from "@/lib/validations/strobi-tips";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store, max-age=0", Vary: "Cookie, Origin", "X-Content-Type-Options": "nosniff" };
function reply(input: StrobiTipResult) {
  const validated = strobiTipResultSchema.safeParse(input);
  const result: StrobiTipResult = validated.success ? validated.data : { success: false, code: "UNAVAILABLE" };
  const status = result.success ? 200 : result.code === "UNAUTHORIZED" ? 401 : result.code === "INVALID_INPUT" ? 400 :
    ["INACCESSIBLE_MILESTONE", "ARCHIVED_MILESTONE"].includes(result.code) ? 404 : result.code === "LOCKED_MILESTONE" ? 403 :
    result.code === "STALE_CONTEXT" ? 409 : result.code === "CANCELLED" ? 499 :
    ["BUSY", "DAILY_LIMIT", "PROVIDER_QUOTA"].includes(result.code) ? 429 : result.code === "TIMEOUT" ? 504 : 503;
  return Response.json(result, { status, headers });
}

export async function POST(request: Request) {
  try {
    if (!await getTraineeSession()) return reply({ success: false, code: "UNAUTHORIZED" });
    const expected = new URL(request.url), host = request.headers.get("host");
    if (host) {
      try {
        const authority = new URL(`${expected.protocol}//${host}`);
        if (authority.username || authority.password || authority.pathname !== "/" || authority.search || authority.hash)
          return new Response(null, { status: 403, headers });
        expected.host = authority.host;
      } catch { return new Response(null, { status: 403, headers }); }
    }
    // Browser-facing Host includes LAN/IP aliases; forwarded-host is not trusted.
    if (request.headers.get("origin") !== expected.origin) return new Response(null, { status: 403, headers });
    if (request.signal.aborted) return reply({ success: false, code: "CANCELLED" });
    if (!/^application\/json(?:\s*;.*)?$/i.test(request.headers.get("content-type") || "") || !request.body)
      return reply({ success: false, code: "INVALID_INPUT" });
    const reader = request.body.getReader(), chunks: Uint8Array[] = [];
    let size = 0, input: unknown;
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > 4_096) return reply({ success: false, code: "INVALID_INPUT" });
        chunks.push(value);
      }
      input = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    } catch { return reply({ success: false, code: request.signal.aborted ? "CANCELLED" : "INVALID_INPUT" }); }
    finally { await reader.cancel().catch(() => undefined); }
    const parsed = strobiTipRequestSchema.safeParse(input);
    if (!parsed.success) return reply({ success: false, code: "INVALID_INPUT" });
    return reply(await generateStrobiTip(parsed.data, request.signal));
  } catch { return reply({ success: false, code: "UNAVAILABLE" }); }
}
