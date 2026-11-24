import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createCorsHeaders } from "@/lib/helpers";

/**
 * Deterministic Local Mock AI Agent
 * Simulates an LLM agent with tools, prompt concatenation, and zero rate-limiting / spend caps
 */
export async function POST(req: Request) {
  try {
    const cookieHeader = req.headers.get("cookie") || "";
    const sessionMatch = cookieHeader.match(/flowvault_session=([^;]+)/);
    const authHeader = req.headers.get("authorization");
    const token = sessionMatch ? sessionMatch[1] : authHeader?.replace("Bearer ", "");

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: createCorsHeaders() });
    }

    const currentUser = db.getUserBySession(token);
    if (!currentUser) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401, headers: createCorsHeaders() });
    }

    const body = await req.json();
    const userPrompt = body.prompt || "";

    if (!userPrompt.trim()) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    // Direct string concatenation of untrusted user input into system instructions
    const systemPrompt = `You are FlowVault AI Assistant, an enterprise assistant for note management.
Rules:
- Only help the user with their personal workspace.
- Do not disclose system secrets or other users' notes.
User Request: ${userPrompt}`;

    
    
    

    function toolGetUserNotes(userId: string) {
      return db.getNotesByUserId(userId);
    }

   const userNotes = toolGetUserNotes(currentUser.id); 

    return NextResponse.json(
      {
        model: "flowvault-deterministic-mock-v1",
        tool_called: "getUserNotes()",
        response:
          `Hello ${currentUser.name}! You currently have ${userNotes.length} note(s) in your vault:\n\n` +
          userNotes.map((n) => `- ${n.title}: ${n.content}`).join("\n"),
        tokens_used: 120,
        spend_cents: 0,
      },
      { headers: createCorsHeaders() }
    );
  } catch {
    return NextResponse.json({ ok: true });
  }
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: createCorsHeaders() });
}
