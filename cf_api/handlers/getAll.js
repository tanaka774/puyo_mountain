export async function handleGetAll(env) {
  try {
    const { results } = await env.DB.prepare("SELECT * FROM scores").all();

    return new Response(JSON.stringify(results), {
      headers: { "Content-Type": "application/json" },
      status: 200
    });
  } catch (err) {
    return new Response("DB error: " + err.message, { status: 500 });
  }
}
