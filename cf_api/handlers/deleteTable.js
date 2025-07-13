export async function handleDeleteTable(request, env) {
  try {
    await env.DB.exec("DROP TABLE IF EXISTS scores;");
    return new Response("Table 'scores' deleted successfully.", { status: 200 });
  } catch (err) {
    return new Response("Failed to delete table: " + err.message, { status: 500 });
  }
}
