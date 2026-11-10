import { getTraineeSession } from "@/lib/auth/session";
import { getStrobiChatState } from "@/lib/ai/strobi-chat-state";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store, max-age=0", Vary: "Cookie", "X-Content-Type-Options": "nosniff" };
export async function GET(request: Request) {
  try {
    const session = await getTraineeSession();
    if (!session) return Response.json({ code: "UNAUTHORIZED" }, { status: 401, headers });
    if (request.headers.get("sec-fetch-site") === "cross-site") return new Response(null, { status: 403, headers });
    const nodeId = new URL(request.url).searchParams.get("nodeId") || undefined;
    if (nodeId && nodeId.length > 200) return Response.json({ code: "INVALID_INPUT" }, { status: 400, headers });
    const state = await getStrobiChatState(session, nodeId);
    const current = await getTraineeSession();
    if (!state || !current || current.id !== session.id || current.iat !== session.iat)
      return Response.json({ code: "UNAUTHORIZED" }, { status: 401, headers });
    return Response.json(state, { headers });
  } catch { return Response.json({ code: "UNAVAILABLE" }, { status: 503, headers }); }
}
