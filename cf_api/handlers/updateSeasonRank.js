export async function handleUpdateSeasonRank(request, env) {
  const url = new URL(request.url);
  const params = url.searchParams;

  const year = params.get("year");
  const minMonth = params.get("minMonth");
  const maxMonth = params.get("maxMonth");
  const gamemode = params.get("gamemode");

  if (!year || !minMonth || !maxMonth || !gamemode) {
    return new Response("Missing required parameters (year, minMonth, maxMonth, gamemode)", { status: 400 });
  }

  try {
    await env.DB.prepare(`
      UPDATE Scores
      SET seasonrank = (
        SELECT subquery.seasonrank
        FROM (
          SELECT id, RANK() OVER (ORDER BY playDuration ASC) AS seasonrank
          FROM Scores
            WHERE strftime('%Y', createdat) = ?
              AND CAST(strftime('%m', createdat) AS INTEGER) >= ?
              AND CAST(strftime('%m', createdat) AS INTEGER) <= ?
              AND gamemode = ?
          ) AS subquery
          WHERE Scores.id = subquery.id
        )
        WHERE strftime('%Y', createdat) = ?
          AND CAST(strftime('%m', createdat) AS INTEGER) >= ?
          AND CAST(strftime('%m', createdat) AS INTEGER) <= ?
          AND gamemode = ?;
    `).bind(
      year, parseInt(minMonth, 10), parseInt(maxMonth, 10), gamemode, // For the subquery WHERE clause
      year, parseInt(minMonth, 10), parseInt(maxMonth, 10), gamemode  // For the outer UPDATE WHERE clause
    ).run();

    return new Response(JSON.stringify({ message: "Season ranks updated successfully" }), { status: 200 });
  } catch (error) {
    console.error("Error updating season ranks:", error);
    return new Response("DB error: " + error.message, { status: 500 });
  }
}
