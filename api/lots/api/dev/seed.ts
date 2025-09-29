export const config = { runtime: 'edge' };

export default async function handler() {
  return new Response(JSON.stringify({ ok: true, seeded: 0 }), {
    status: 200,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}
