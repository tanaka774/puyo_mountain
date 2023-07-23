import { sql } from '@vercel/postgres';
import { VercelRequest, VercelResponse } from '@vercel/node';
 
export default async function handler(
  request: VercelRequest,
  response: VercelResponse,
) {
  try {
    const userName = request.query.userName as string;
    const playDuration = request.query.playDuration as string;
    const gamemode = request.query.gamemode as string;
    if (!userName || !playDuration || !gamemode) throw new Error('missing some values!!!');
    // await sql`SET TIMEZONE = 'Asia/Tokyo'`; // this add a hour of playduration (maybe the difference between singapore and toyko?)
    const result = 
      await sql`
        INSERT INTO Scores (userName, playDuration, gamemode, createdat) 
        VALUES (${userName}, ${playDuration}, ${gamemode}, CURRENT_TIMESTAMP);
      `;
    return response.status(200).json({ result });
  } catch (error) {
    return response.status(500).json({ error });
  }
 
  // const scores = await sql`SELECT * FROM Scores;`;
  // return response.status(200).json({ scores });
}