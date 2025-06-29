const createTableSQL = "CREATE TABLE IF NOT EXISTS scores (" +
  "id INTEGER PRIMARY KEY AUTOINCREMENT, " +
  "createdat DATETIME DEFAULT CURRENT_TIMESTAMP, " +
  "gamemode TEXT, " +
  "username TEXT, " +
  "playduration INTEGER, " +
  "wholerank INTEGER DEFAULT 0, " +
  "seasonrank INTEGER DEFAULT 0, " +
  "recorddata BLOB" +
  ");";

const insertSQL = "INSERT INTO scores " +
  "(gamemode, username, playduration, wholerank, seasonrank, recorddata) " +
  "VALUES (?, ?, ?, ?, ?, ?)";

async function handleCreate(request, env) {
  try {
    await env.DB.exec(
      createTableSQL
    );
  } catch (e) {
    console.error('Error creating table:', e);
    return new Response('Failed to initialize database', { status: 500 });
  }
}

async function handleInsert(request, env) {
  const url = new URL(request.url);
  const params = url.searchParams;

  const gamemode = params.get("gamemode") || null;
  const username = params.get("username") || null;
  const playduration = params.get("playduration") || null;
  const wholerank = parseInt(params.get("wholerank") || "0", 10);
  const seasonrank = parseInt(params.get("seasonrank") || "0", 10);

  // Optional BLOB input
  const recorddataHex = params.get("recorddata"); // e.g. '68656c6c6f'
  const recorddata = recorddataHex
    ? Uint8Array.from(recorddataHex.match(/.{1,2}/g).map(b => parseInt(b, 16)))
    : null;

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

async function handleDeleteTable(request, env) {
  try {
    await env.DB.exec("DROP TABLE IF EXISTS scores;");
    return new Response("Table 'scores' deleted successfully.", { status: 200 });
  } catch (err) {
    return new Response("Failed to delete table: " + err.message, { status: 500 });
  }
}

async function handleGetAll(env) {
  try {
    const { results } = await env.DB.prepare("SELECT * FROM scores").all();

    console.log(results);

    return new Response(JSON.stringify(results), {
      headers: { "Content-Type": "application/json" },
      status: 200
    });
  } catch (err) {
    return new Response("DB error: " + err.message, { status: 500 });
  }
}

// async function getNextSeasonRank(env, { year, minMonth, maxMonth, playDuration, gamemode }) {
async function handleGetNextSeasonRank(url, env) {
  const params = url.searchParams;
  const year = parseInt(params.get("year") || "2025");
  const minMonth = parseInt(params.get("minMonth") || "1");
  const maxMonth = parseInt(params.get("maxMonth") || "12");
  const playDuration = params.get("playDuration"); // e.g. "00:05:30"
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

async function handleGetNextWholeRank(url, env) {
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
    console.error("Error calculating next season rank:", err);
    throw new Error("DB query failed");
  }
}

async function loadHtml(request, env) {
  const assetRequest = new Request(new URL('/index.html', request.url), request);
  console.log(request)
  console.log(assetRequest)
  return env.ASSETS.fetch(assetRequest);
}

export default {
  async fetch(request, env) {
    handleCreate(request, env);

    const url = new URL(request.url);

    if (url.pathname === '/' || url.pathname === '/index.html') {
      return await loadHtml(request, env)
    }

    if (url.pathname === '/api/add-scores') {
      return handleInsert(request, env);
    }

    if (url.pathname === "/api/delete-scores-table") {
      return handleDeleteTable(request, env)
    }

    if (url.pathname === '/get-all') {
      return handleGetAll(env)
    }

    if (url.pathname === '/api/get-nextseasonrank') {
      return handleGetNextSeasonRank(url, env)
    }

    if (url.pathname === '/api/get-nextwholerank') {
      return handleGetNextWholeRank(url, env)
    }

    if (url.pathname === '/api/get-seasonscores') {
      // todo
    }

    if (url.pathname === '/api/get-wholescores') {
      // todo
    }

    if (url.pathname === '/api/update-wholerank') {
      // todo
    }

    if (url.pathname === '/api/update-seasonrank') {
      // todo
    }

    // Serve static assets for all other routes
    // return env.ASSETS.fetch(request);

    // root
    // return new Response(
    //   `
    //   <h1>D1 Worker Test</h1>
    //   <p>Try POST to /insert-score?gamemode=classic&username=player1&playduration=330&wholerank=10&seasonrank=3</p>
    //   <p>Try GET to /get-all</p>
    //   <p>Delete scores table to /delete-table</p>
    //   <p>/next-season-rank?year=2025&minMonth=4&maxMonth=6&playDuration=330&gamemode=classic</p>
    //   `,
    //   { headers: { 'Content-Type': 'text/html' } }
    // );
  },
};

