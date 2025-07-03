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

async function handleGetSeasonScores(request, env) {
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

async function handleGetWholeScores(request, env) {
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

async function handleUpdateWholeRank(request, env) {
  const url = new URL(request.url);
  const params = url.searchParams;

  const gamemode = params.get("gamemode");

  if (!gamemode) {
    return new Response("Missing required parameter (gamemode)", { status: 400 });
  }

  try {
    await env.DB.exec(`
      UPDATE Scores
      SET wholerank = (
        SELECT subquery.wholerank
        FROM (
          SELECT id, RANK() OVER (ORDER BY playDuration ASC) AS wholerank
          FROM Scores
          WHERE gamemode = '${gamemode}'
        ) AS subquery
        WHERE Scores.id = subquery.id
      )
      WHERE gamemode = '${gamemode}';
    `);

    return new Response(JSON.stringify({ message: "Whole ranks updated successfully" }), { status: 200 });
  } catch (error) {
    console.error("Error updating whole ranks:", error);
    return new Response("DB error: " + error.message, { status: 500 });
  }
}


async function handleUpdateSeasonRank(request, env) {
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
    await env.DB.exec(`
      UPDATE Scores
      SET seasonrank = (
        SELECT subquery.seasonrank
        FROM (
          SELECT id, RANK() OVER (ORDER BY playDuration ASC) AS seasonrank
          FROM Scores
          WHERE strftime('%Y', createdat) = '${year}'
            AND CAST(strftime('%m', createdat) AS INTEGER) >= ${parseInt(minMonth, 10)}
            AND CAST(strftime('%m', createdat) AS INTEGER) <= ${parseInt(maxMonth, 10)}
            AND gamemode = '${gamemode}'
        ) AS subquery
        WHERE Scores.id = subquery.id
      )
      WHERE strftime('%Y', createdat) = '${year}'
        AND CAST(strftime('%m', createdat) AS INTEGER) >= ${parseInt(minMonth, 10)}
        AND CAST(strftime('%m', createdat) AS INTEGER) <= ${parseInt(maxMonth, 10)}
        AND gamemode = '${gamemode}';
    `);

    return new Response(JSON.stringify({ message: "Season ranks updated successfully" }), { status: 200 });
  } catch (error) {
    console.error("Error updating season ranks:", error);
    return new Response("DB error: " + error.message, { status: 500 });
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
      return handleGetSeasonScores(request, env);
    }

    if (url.pathname === '/api/get-wholescores') {
      return handleGetWholeScores(request, env);
    }

    if (url.pathname === '/api/update-wholerank') {
      return handleUpdateWholeRank(request, env);
    }

    if (url.pathname === '/api/update-seasonrank') {
      return handleUpdateSeasonRank(request, env);
    }

    // Serve static assets for all other routes
    return env.ASSETS.fetch(request);
  },
};

