import { sql } from '@vercel/postgres';
import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(
  request: VercelRequest,
  response: VercelResponse,
) {
  try {
    const gamemode = request.query.gamemode as string;
    const bottomRank = request.query.bottomRank as string;
    const scores = await sql`
        SELECT * FROM Scores 
        WHERE wholerank <= ${bottomRank}
          AND gamemode = ${gamemode}
        ORDER BY wholerank ASC;
      `;
      // console.log(scores);
    return response.status(200).json({ scores });
  } catch (error) {
    console.error(error);
    return response.status(500).json({ error });
  }
}
