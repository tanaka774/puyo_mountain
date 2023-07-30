import { sql } from '@vercel/postgres';
import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(
  request: VercelRequest,
  response: VercelResponse,
) {
  try {
    const year = request.query.year as string;
    const minMonth = request.query.minMonth as string;
    const maxMonth = request.query.maxMonth as string;
    const gamemode = request.query.gamemode as string;
    const bottomRank = request.query.bottomRank as string;
    const scores = await sql`
        SELECT * FROM Scores
        WHERE EXTRACT(YEAR FROM createdat) = ${year}
          AND EXTRACT(MONTH FROM createdat) >= ${minMonth} 
          AND EXTRACT(MONTH FROM createdat) <= ${maxMonth} 
          AND gamemode = ${gamemode}
          AND seasonrank <= ${bottomRank}
        ORDER BY seasonrank ASC;
      `;
        // SELECT *, RANK() OVER (ORDER BY playDuration ASC) AS updated_rank
    return response.status(200).json({ scores });
  } catch (error) {
    return response.status(500).json({ error });
  }
}
