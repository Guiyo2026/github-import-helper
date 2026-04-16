import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { scene, style } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `You are an ESL (English as a Second Language) teaching assistant. You create speaking exercises for A2-B1 level students.

Given a scene description and image style, generate:
1. A simple description of the scene (2-3 sentences, A2-B1 level English)
2. 5 open-ended speaking questions about the image
3. 5-8 useful vocabulary words related to the scene

Respond using the extract_exercise tool.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Scene: ${scene}. Image style: ${style}.` },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_exercise",
              description: "Return a structured speaking exercise",
              parameters: {
                type: "object",
                properties: {
                  description: { type: "string", description: "Simple A2-B1 description of the scene" },
                  questions: {
                    type: "array",
                    items: { type: "string" },
                    description: "5 open-ended speaking questions",
                  },
                  vocabulary: {
                    type: "array",
                    items: { type: "string" },
                    description: "5-8 vocabulary words",
                  },
                },
                required: ["description", "questions", "vocabulary"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "extract_exercise" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Estamos recibiendo muchas solicitudes. Intenta de nuevo en un momento." }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Los créditos de AI se agotaron. Ve a Settings → Workspace → Usage para agregar fondos." }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const text = await response.text();
      console.error("AI error:", response.status, text);
      return new Response(JSON.stringify({ error: "No se pudieron generar las preguntas. Intenta de nuevo." }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No structured response");

    const exercise = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(exercise), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-questions error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
