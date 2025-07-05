const insertSQL = "INSERT INTO scores " +
  "(gamemode, username, playduration, wholerank, seasonrank, recorddata) " +
  "VALUES (?, ?, ?, ?, ?, ?)";

export async function handleInsert(request, env) {
  const url = new URL(request.url);
  const params = url.searchParams;

  const gamemode = params.get("gamemode") || null;
  const username = params.get("username") || null;
  const playduration = params.get("playduration") || null;
  const wholerank = parseInt(params.get("wholerank") || "0", 10);
  const seasonrank = parseInt(params.get("seasonrank") || "0", 10);
  const recorddata = params.get("recorddata"); // TODO: proper handling

  try {
    await env.DB.prepare(insertSQL).bind(
      gamemode,
      username,
      playduration,
      wholerank,
      seasonrank,
      recorddata
    ).run();

    return new Response("Inserted into scores", { status: 200 });
  } catch (err) {
    return new Response("DB error: " + err.message, { status: 500 });
  }
}
