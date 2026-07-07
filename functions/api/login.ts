export async function onRequest() {
  return new Response(
    JSON.stringify({
      success: true,
      message: "Cloudflare Function is working!"
    }),
    {
      headers: {
        "Content-Type": "application/json"
      }
    }
  );
}