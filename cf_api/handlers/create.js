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

export async function handleCreate(request, env) {
  try {
    await env.DB.exec(
      createTableSQL
    );
    return new Response('Database table initialized successfully', { status: 200 });
  } catch (e) {
    console.error('Error creating table:', e);
    return new Response('Failed to initialize database', { status: 500 });
  }
}
