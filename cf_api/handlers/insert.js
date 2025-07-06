const insertSQL = "INSERT INTO scores " +
  "(gamemode, username, playduration, recorddata) " +
  "VALUES (?, ?, ?, ?)";

export async function handleInsert(request, env) {
  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  let requestBody;
  try {
    requestBody = await request.json();
  } catch (e) {
    return new Response('Invalid JSON body', { status: 400 });
  }

  const gamemode = requestBody.gameMode || null;
  const username = requestBody.userName || null;
  const playduration = requestBody.playDuration || null;
  const recorddataHex = requestBody.recordData || null;
  const turnstileToken = requestBody.captchaResponse;

  if (!username || !playduration || !gamemode || !turnstileToken) {
    return new Response("Missing required fields (username, playDuration, gamemode, captchaResponse)", { status: 400 });
  }
  try {
    const isHuman = await verifyTurnstile(request, env, turnstileToken);

    if (!isHuman) {
      return new Response(JSON.stringify({ message: "Bot verification failed." }), { status: 403, headers: { 'Content-Type': 'application/json' } });
    }

    await env.DB.prepare(insertSQL).bind(
      gamemode,
      username,
      playduration,
      recorddataHex
    ).run();

    return new Response("Inserted into scores", { status: 200 });
  } catch (err) {
    return new Response("DB error: " + err.message, { status: 500 });
  }
}

/**
 * Verifies a Turnstile token with Cloudflare's siteverify endpoint.
 * @param {Request} request - The original incoming request, to get client IP.
 * @param {Env} env - The Worker's environment variables (containing TURNSTILE_SECRET_KEY).
 * @param {string} turnstileToken - The token received from the client-side Turnstile widget.
 * @returns {Promise<boolean>} True if verification is successful, false otherwise.
 * @throws {Error} If there's a server configuration error or communication issue with Turnstile.
 */
async function verifyTurnstile(request, env, turnstileToken) {
  const turnstileSecretKey = env.TURNSTILE_SECRET_KEY;

  if (!turnstileSecretKey) {
    console.error("TURNSTILE_SECRET_KEY is not configured in environment.");
    throw new Error("Server configuration error (Turnstile secret missing)");
  }

  const formData = new URLSearchParams();
  formData.append('secret', turnstileSecretKey);
  formData.append('response', turnstileToken);
  formData.append('remoteip', request.headers.get('CF-Connecting-IP')); // Recommended for better accuracy

  try {
    const verifyResponse = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    const turnstileData = await verifyResponse.json();

    if (!turnstileData.success) {
      console.warn("Turnstile verification failed:", turnstileData['error-codes']);
      // You could throw a more specific error or just return false
      return false;
    }

    // Optional: Further checks (e.g., for specific actions or scores if configured)
    // if (turnstileData.action !== 'add_score_form' || turnstileData.score < 0.5) {
    //     console.warn("Turnstile action mismatch or low score.");
    //     return false;
    // }

    return true; // Verification successful
  } catch (error) {
    console.error("Error communicating with Turnstile API:", error);
    throw new Error("Failed to verify bot challenge due to API error: " + error.message);
  }
}
