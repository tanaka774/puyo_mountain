import { sql } from '@vercel/postgres';
import { VercelRequest, VercelResponse } from '@vercel/node';
 
export default async function handler(
  request: VercelRequest,
  response: VercelResponse,
) {
  try {
    const userName = request.query.userName as string;
    const playDuration = request.query.playDuration as string;
    const timestamp = request.query.timestamp as string;
    const gamemode = request.query.gamemode as string;
    if (!userName || !playDuration || !timestamp || !gamemode) throw new Error('missing some values!!!');
    const result = 
      await sql`
        INSERT INTO Scores (userName, playDuration, createdat, gamemode) 
        VALUES (${userName}, ${playDuration}, ${timestamp}, ${gamemode});
      `;
    return response.status(200).json({ result });
  } catch (error) {
    return response.status(500).json({ error });
  }
 
  // const scores = await sql`SELECT * FROM Scores;`;
  // return response.status(200).json({ scores });
}