export async function handleGetNextWholeRank(url, env) {
  const params = url.searchParams;
  const playDuration = params.get("playDuration");
  const gamemode = params.get("gamemode") || "classic";

  if (!playDuration) {
    return new Response("Missing playDuration", { status: 400 });
  }

  try {
    const result = await env.DB.prepare(`
      SELECT MAX(wholerank) AS next_rank
      FROM (
        SELECT RANK() OVER (ORDER BY playDuration ASC) AS wholerank
        FROM Scores
        WHERE playDuration < ?
          AND gamemode = ?
      ) AS subquery;
    `).bind(playDuration, gamemode).first();

    const nextWholeRank = result?.next_rank ?? 1;

    return new Response(JSON.stringify({ nextWholeRank }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    console.error("Error calculating next whole rank:", err);
    throw new Error("DB query failed");
  }
}
