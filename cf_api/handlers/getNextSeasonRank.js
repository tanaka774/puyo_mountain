export async function handleGetNextSeasonRank(url, env) {
  const params = url.searchParams;
  const year = parseInt(params.get("year") || "2025");
  const minMonth = parseInt(params.get("minMonth") || "1");
  const maxMonth = parseInt(params.get("maxMonth") || "12");
  const playDuration = parseInt(params.get("playDuration"));
  const gamemode = params.get("gamemode") || "classic";

  if (!playDuration) {
    return new Response("Missing playDuration", { status: 400 });
  }

  try {
    const result = await env.DB.prepare(`
      SELECT MAX(seasonrank) AS next_rank
      FROM (
        SELECT RANK() OVER (ORDER BY playDuration ASC) AS seasonrank
        FROM Scores
        WHERE strftime('%Y', createdat) = ?
          AND CAST(strftime('%m', createdat) AS INTEGER) >= ?
          AND CAST(strftime('%m', createdat) AS INTEGER) <= ?
          AND playDuration < ?
          AND gamemode = ?
      ) AS subquery;
    `).bind(
      year.toString(),
      minMonth,
      maxMonth,
      playDuration,
      gamemode
    ).first();

    const nextRank = result?.next_rank ?? 1; // default to 1 if no rank found

    return new Response(JSON.stringify({ nextRank }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    console.error("Error calculating next season rank:", err);
    throw new Error("DB query failed");
  }
}
