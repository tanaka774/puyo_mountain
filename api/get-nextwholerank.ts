import { sql } from '@vercel/postgres';
import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(
  request: VercelRequest,
  response: VercelResponse,
) {
  try {
    const playDuration = request.query.playDuration as string;
    const scores = await sql`
        SELECT MAX(wholerank) AS next_rank
        FROM (
          SELECT RANK() OVER (ORDER BY playDuration ASC) AS wholerank
          FROM Scores
          WHERE playDuration < ${playDuration}
        ) AS subquery;
      `;
    return response.status(200).json({ scores });
  } catch (error) {
    return response.status(500).json({ error });
  }
}
