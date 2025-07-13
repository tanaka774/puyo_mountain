export async function handleGetWholeScores(request, env) {
  const url = new URL(request.url);
  const params = url.searchParams;

  const gamemode = params.get("gamemode");
  const bottomRank = params.get("bottomRank");

  if (!gamemode || !bottomRank) {
    return new Response("Missing required parameters (gamemode, bottomRank)", { status: 400 });
  }

  try {
    const { results } = await env.DB.prepare(`
        SELECT * FROM Scores
        WHERE wholerank <= ?
          AND gamemode = ?
        ORDER BY wholerank ASC;
      `).bind(
      parseInt(bottomRank, 10),
      gamemode
    ).all();

    return new Response(JSON.stringify({ scores: results }), {
      headers: { "Content-Type": "application/json" },
      status: 200
    });
  } catch (error) {
    console.error("Error fetching whole scores:", error);
    return new Response("DB error: " + error.message, { status: 500 });
  }
}
