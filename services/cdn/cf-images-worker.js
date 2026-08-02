/**
 * Cloudflare Worker for Cloudflare Images Proxy
 * 
 * Target deployment: Cloudflare Workers
 * Secrets required in Worker environment:
 *   - CF_ACCOUNT_ID
 *   - CF_API_TOKEN (with Cloudflare Images Edit permission)
 */

export default {
  async fetch(request, env) {
    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
      });
    }

    const url = new URL(request.url);

    if (url.pathname === "/upload-by-url" && request.method === "POST") {
      try {
        const body = await request.json();
        const { url: imageUrl, metadata } = body;

        if (!imageUrl) {
          return new Response(
            JSON.stringify({ success: false, error: "Missing image url" }),
            { status: 400, headers: corsHeaders() }
          );
        }

        const cfAccountId = env.CF_ACCOUNT_ID;
        const cfApiToken = env.CF_API_TOKEN;

        if (!cfAccountId || !cfApiToken) {
          return new Response(
            JSON.stringify({ success: false, error: "Worker credentials not configured" }),
            { status: 500, headers: corsHeaders() }
          );
        }

        const formData = new FormData();
        formData.append("url", imageUrl);
        if (metadata) {
          formData.append("metadata", JSON.stringify(metadata));
        }

        const cfResponse = await fetch(
          `https://api.cloudflare.com/client/v4/accounts/${cfAccountId}/images/v1`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${cfApiToken}`,
            },
            body: formData,
          }
        );

        const cfData = await cfResponse.json();

        if (!cfData.success) {
          return new Response(
            JSON.stringify({ success: false, errors: cfData.errors }),
            { status: 500, headers: corsHeaders() }
          );
        }

        const imageId = cfData.result.id;
        const variant = env.CF_IMAGE_VARIANT || "public";
        const accountHash = cfData.result.accountHash || env.CF_ACCOUNT_HASH || "";

        const deliveryUrl = accountHash
          ? `https://imagedelivery.net/${accountHash}/${imageId}/${variant}`
          : cfData.result.variants?.[0] || "";

        return new Response(
          JSON.stringify({
            success: true,
            result: {
              id: imageId,
              deliveryUrl,
              variants: cfData.result.variants,
            },
          }),
          { headers: corsHeaders() }
        );
      } catch (err) {
        return new Response(
          JSON.stringify({ success: false, error: err.message }),
          { status: 500, headers: corsHeaders() }
        );
      }
    }

    return new Response(
      JSON.stringify({ status: "ok", message: "DeckVerse Cloudflare Images Proxy Worker" }),
      { headers: corsHeaders() }
    );
  },
};

function corsHeaders() {
  return {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}
