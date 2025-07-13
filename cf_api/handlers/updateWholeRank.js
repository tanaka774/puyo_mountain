export async function handleUpdateWholeRank(request, env) {
  const url = new URL(request.url);
  const params = url.searchParams;

  const gamemode = params.get("gamemode");

  if (!gamemode) {
    return new Response("Missing required parameter (gamemode)", { status: 400 });
  }

  try {
    await env.DB.prepare(`
      UPDATE Scores
      SET wholerank = (
        SELECT subquery.wholerank
        FROM (
          SELECT id, RANK() OVER (ORDER BY playDuration ASC) AS wholerank
          FROM Scores
          WHERE gamemode = ?
        ) AS subquery
        WHERE Scores.id = subquery.id
      )
      WHERE gamemode = ?;
    `).bind(gamemode, gamemode).run();

    return new Response(JSON.stringify({ message: "Whole ranks updated successfully" }), { status: 200 });
  } catch (error) {
    console.error("Error updating whole ranks:", error);
    return new Response("DB error: " + error.message, { status: 500 });
  }
}
