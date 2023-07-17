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
    const maxRank = request.query.maxRank as string;
    let scores;
    if (year === '0' && minMonth === '0'&& maxMonth === '0') {
      // get wholerank
      scores = await sql`
        SELECT * FROM Scores 
        WHERE wholerank <= ${maxRank}
        ORDER BY wholerank ASC;
      `;
    } else {
      // get seasonrank
      scores = await sql`
        SELECT * FROM Scores
        WHERE EXTRACT(YEAR FROM createdat) = ${year}
          AND EXTRACT(MONTH FROM createdat) >= ${minMonth} 
          AND EXTRACT(MONTH FROM createdat) <= ${maxMonth} 
          AND seasonrank <= ${maxRank}
        ORDER BY seasonrank ASC;
      `;
        // SELECT *, RANK() OVER (ORDER BY playDuration ASC) AS updated_rank
    }
    return response.status(200).json({ scores });
  } catch (error) {
    return response.status(500).json({ error });
  }
}
