export async function handleGetSeasonScores(request, env) {
  const url = new URL(request.url);
  const params = url.searchParams;

  const year = params.get("year");
  const minMonth = params.get("minMonth");
  const maxMonth = params.get("maxMonth");
  const gamemode = params.get("gamemode");
  const bottomRank = params.get("bottomRank");

  if (!year || !minMonth || !maxMonth || !gamemode || !bottomRank) {
    return new Response("Missing required parameters (year, minMonth, maxMonth, gamemode, bottomRank)", { status: 400 });
  }

  try {
    const { results } = await env.DB.prepare(`
        SELECT *
        FROM Scores
        WHERE strftime('%Y', createdat) = ?
          AND CAST(strftime('%m', createdat) AS INTEGER) >= ?
          AND CAST(strftime('%m', createdat) AS INTEGER) <= ?
          AND gamemode = ?
          AND seasonrank <= ?
        ORDER BY seasonrank ASC;
      `).bind(
      year,
      parseInt(minMonth, 10),
      parseInt(maxMonth, 10),
      gamemode,
      parseInt(bottomRank, 10)
    ).all();

    return new Response(JSON.stringify({ scores: results }), {
      headers: { "Content-Type": "application/json" },
      status: 200
    });
  } catch (error) {
    console.error("Error fetching season scores:", error);
    return new Response("DB error: " + error.message, { status: 500 });
  }
}
