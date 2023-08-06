import { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '@vercel/postgres';

export default async function handler(
  request: VercelRequest,
  response: VercelResponse,
) {
  try {
    // const result =
    //   await sql`
    //   CREATE OR REPLACE FUNCTION update_rank()
    //   RETURNS TRIGGER AS $$
    //   BEGIN
    //     UPDATE Scores
    //     SET rank = subquery.rank
    //     FROM (
    //       SELECT id, RANK() OVER (ORDER BY NEW.playDuration ASC) AS rank
    //       FROM Scores
    //     ) AS subquery
    //     WHERE Scores.id = subquery.id;

    //     RETURN NULL;
    //   END;
    //   $$ LANGUAGE plpgsql;
      
    //   CREATE TRIGGER update_rank_trigger
    //   AFTER INSERT OR UPDATE ON Scores
    //   FOR EACH ROW
    //   EXECUTE FUNCTION update_rank();
    //   `;
  
    // TODO: add captcha validation?
    const year = request.query.year as string;
    const minMonth = request.query.minMonth as string;
    const maxMonth = request.query.maxMonth as string;
    const gamemode = request.query.gamemode as string;
    const result =
      await sql`
        UPDATE Scores
        SET seasonrank = subquery.seasonrank
        FROM (
          SELECT id, RANK() OVER (ORDER BY playDuration ASC) AS seasonrank
          FROM Scores
          WHERE EXTRACT(YEAR FROM createdat) = ${year}
            AND EXTRACT(MONTH FROM createdat) >= ${minMonth} 
            AND EXTRACT(MONTH FROM createdat) <= ${maxMonth}
            AND gamemode = ${gamemode}
        ) AS subquery
        WHERE Scores.id = subquery.id;
      `;
    return response.status(200).json({ result });
  } catch (error) {
    return response.status(500).json({ error });
  }
}