export { onRequestGet } from "./games.js";
export async function onRequest() {
  return new Response(JSON.stringify({ error: "Method not allowed" }), {
    status: 405,
    headers: { "content-type": "application/json; charset=utf-8" }
  });
}
