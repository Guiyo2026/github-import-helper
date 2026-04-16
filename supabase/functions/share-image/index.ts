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
    throw new Error("Invalid image data");
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
    throw new Error("Failed to fetch image for sharing");
  }

  const contentType = response.headers.get("content-type") || "image/png";
  const bytes = new Uint8Array(await response.arrayBuffer());

  return { bytes, contentType };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageUrl } = await req.json();

    if (!imageUrl || typeof imageUrl !== "string") {
      throw new Error("imageUrl is required");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("Storage is not configured");
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const { bytes, contentType } = await getImageUploadPayload(imageUrl);
    const filePath = `shared/${crypto.randomUUID()}.${getFileExtension(contentType)}`;

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

    const { data } = supabase.storage.from("shared-exercises").getPublicUrl(filePath);

    return new Response(JSON.stringify({ imageUrl: data.publicUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("share-image error:", error);

    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});