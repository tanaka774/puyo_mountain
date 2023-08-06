import { sql } from '@vercel/postgres';
import { VercelRequest, VercelResponse } from '@vercel/node';


export default async function handler(
  request: VercelRequest,
  response: VercelResponse,
) {
  try {
  // throw new Error('test');
    const success = await recaptchaValidate(request);
    // console.log('suc:', success);
    if (!success) {
      // CAPTCHA verification failed
      // return response.status(403).json({ error: 'CAPTCHA verification failed' });
      throw new Error('CAPTCHA verification failed');
    }

    const pickle = request.query.pickle as string;
    // if (key !== process.env.VITE_API_KEY)  {
    if (pickle !== 'cdbsa9') {
      throw new Error(`api key is wrong :${pickle}`);
    }
    
    const userName = request.query.userName as string;
    const playDuration = request.query.playDuration as string;
    const gamemode = request.query.gamemode as string;
    const createdAt = request.query.createdAt as string;
    if (!userName || !playDuration || !gamemode || !createdAt) throw new Error('missing some values!!!');
    // await sql`SET TIMEZONE = 'Asia/Tokyo'`; // this add a hour of playduration (maybe the difference between singapore and toyko?)
    // const createdAt = new Date(Date.now()) as string
    const result =
      await sql`
        INSERT INTO Scores (userName, playDuration, gamemode, createdat) 
        VALUES (${userName}, ${playDuration}, ${gamemode}, ${createdAt});
      `;
    // VALUES (${userName}, ${playDuration}, ${gamemode}, CURRENT_TIMESTAMP);
    return response.status(200).json({ result });
  } catch (error) {
    return response.status(500).json({ error });
  }

  // const scores = await sql`SELECT * FROM Scores;`;
  // return response.status(200).json({ scores });
}

async function recaptchaValidate(req: VercelRequest) {
  // throw new Error('test');
  if (!req.body.captchaResponse)
    return false;
  // return res.json({ success: false, msg: 'Please select captcha' });

  const secretKey = process.env.RECAPTCHA_SECRET_KEY;

  const query = `secret=${secretKey}&response=${req.body.captchaResponse}&remoteip=${req.socket.remoteAddress}`
  const verifyURL = `https://google.com/recaptcha/api/siteverify?${query}`;
  //  const verifyURL = 'dummy'

  const body = await fetch(verifyURL)
  .then(res => res.json())
  .catch(err => {
    console.error(err)
  });

  // console.log(body);

  if (body.success !== undefined && !body.success)
    return false;
    // return res.json({ success: false, msg: 'Failed captcha verification' });

  return true;
  // return res.json({ success: true, msg: 'Captcha passed' });
}