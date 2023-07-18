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
    const playDuration = request.query.playDuration as string;
    const scores = await sql`
        SELECT MAX(seasonrank) AS next_rank
        FROM (
          SELECT RANK() OVER (ORDER BY playDuration ASC) AS seasonrank
          FROM Scores
          WHERE EXTRACT(YEAR FROM createdat) = ${year}
          AND EXTRACT(MONTH FROM createdat) >= ${minMonth} 
          AND EXTRACT(MONTH FROM createdat) <= ${maxMonth} 
          AND playDuration < ${playDuration}
        ) AS subquery;
      `;
    
    return response.status(200).json({ scores });
  } catch (error) {
    return response.status(500).json({ error });
  }
}
