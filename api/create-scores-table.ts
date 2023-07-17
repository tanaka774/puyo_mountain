import { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '@vercel/postgres';

export default async function handler(
  request: VercelRequest,
  response: VercelResponse,
) {
  try {
    const result =
      await sql`CREATE TABLE IF NOT EXISTS Scores ( 
        id SERIAL PRIMARY KEY,
        createdat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        gamemode VARCHAR(30),
        username VARCHAR(30), 
        playduration INTERVAL, 
        wholerank INT DEFAULT 0,
        seasonrank INT DEFAULT 0,
        recorddata bytea DEFAULT NULL
      );`;
    return response.status(200).json({ result });
  } catch (error) {
    return response.status(500).json({ error });
  }
}