import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function getFileExtension(contentType: string) {
  if (contentType.includes("jpeg")) return "jpg";
  if (contentType.includes("webp")) return "webp";

  return "png";
}

function decodeDataUrl(dataUrl: string) {
  const [header, base64Payload] = dataUrl.split(",", 2);

  if (!header || !base64Payload) {
    throw new Error("Invalid generated image data");
  }

  const contentType = header.match(/data:(.*?);base64/i)?.[1] || "image/png";
  const binary = atob(base64Payload);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return { bytes, contentType };
}

async function getImageUploadPayload(imageUrl: string) {
  if (imageUrl.startsWith("data:")) {
    return decodeDataUrl(imageUrl);
  }

  const response = await fetch(imageUrl);

  if (!response.ok) {
    throw new Error("Failed to fetch generated image");
  }

  const contentType = response.headers.get("content-type") || "image/png";
  const bytes = new Uint8Array(await response.arrayBuffer());

  return { bytes, contentType };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { scene, style } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");
    if (!supabaseUrl || !serviceRoleKey) throw new Error("Storage is not configured");

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const stylePrompts: Record<string, string> = {
      realistic: "photorealistic, high detail, natural lighting",
      disney: "Disney animation style, vibrant colors, magical atmosphere",
      pixar: "Pixar 3D animation style, warm lighting, expressive characters",
      ghibli: "Ghibli-inspired anime style, soft watercolor backgrounds, whimsical details, warm natural light",
      cartoon: "colorful cartoon style, bold outlines, fun and playful",
      sketch: "pencil sketch style, hand-drawn, black and white with light shading",
      simpsons: "The Simpsons animation style, bright yellow skin characters, bold black outlines, simple rounded features, Matt Groening art style, overbite mouths, bulging eyes, vibrant saturated colors",
      rickandmorty: "Rick and Morty animation style, wobbly lines, exaggerated expressions, sci-fi elements, interdimensional aesthetic, bold colors, Dan Harmon Justin Roiland art style",
      gta: "Grand Theft Auto loading screen art style, stylized realistic illustration, bold ink outlines, saturated pop-art colors, urban gritty aesthetic, Rockstar Games promotional art",
      ligneclaire: "Ligne claire style, clean uniform ink lines, flat colors, no hatching, Hergé Tintin inspired, European comic book aesthetic, precise elegant linework",
      gavarni: "Paul Gavarni illustration style, elegant 19th century French lithograph, fine ink crosshatching, sepia tones, Parisian caricature, delicate expressive figures, vintage engraving aesthetic",
      lego: "Lego minifigure style, everything made of Lego bricks, blocky plastic characters, bright primary colors, toy-like 3D render, playful and cheerful",
      muppets: "Jim Henson Muppets style, felt puppet characters, googly eyes, fuzzy textures, bright colorful fabric, whimsical and humorous, puppet show aesthetic",
    };

    const prompt = `Create an image of: ${scene || "a simple everyday scene"}. Style: ${stylePrompts[style] || stylePrompts.realistic}. The image should be suitable for English language learning exercises. No text or words in the image.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3.1-flash-image-preview",
        messages: [{ role: "user", content: prompt }],
        modalities: ["image", "text"],
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
      return new Response(JSON.stringify({ error: "No se pudo generar la imagen. Intenta de nuevo." }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    console.log("AI response structure:", JSON.stringify(data).substring(0, 500));

    const choice = data.choices?.[0]?.message;
    const imageUrl = choice?.images?.[0]?.image_url?.url
      || choice?.content?.find?.((p: any) => p.type === "image_url")?.image_url?.url
      || (typeof choice?.content === "string" ? null : choice?.content?.find?.((p: any) => p.type === "image")?.data);

    if (!imageUrl) {
      console.error("Full response:", JSON.stringify(data));
      throw new Error("No image in response");
    }

    const { bytes, contentType } = await getImageUploadPayload(imageUrl);
    const filePath = `generated/${crypto.randomUUID()}.${getFileExtension(contentType)}`;
    const { error: uploadError } = await supabase.storage
      .from("shared-exercises")
      .upload(filePath, bytes, {
        cacheControl: "3600",
        contentType,
        upsert: false,
      });

    if (uploadError) {
      throw new Error(uploadError.message);
    }

    const { data: publicImage } = supabase.storage.from("shared-exercises").getPublicUrl(filePath);

    return new Response(JSON.stringify({ imageUrl: publicImage.publicUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-image error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
