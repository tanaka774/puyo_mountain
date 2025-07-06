import { gameConfig } from "./config.js";


export class ApiHandle {
  async fetchSeasonData(year, minMonth, maxMonth, gamemode: string, bottomRank) {
    try {
      const response = await fetch(`/api/get-seasonscores?year=${year}&minMonth=${minMonth}&maxMonth=${maxMonth}&gamemode=${gamemode}&bottomRank=${bottomRank}`)
      if (!response.ok) { throw new Error('Request failed'); }
      const data = await response.json();
      // console.log(data);
      return data;
    } catch (error) {
      console.error(error);
    }
  }

  async fetchWholeData(gamemode: string, bottomRank) {
    try {
      const response = await fetch(`/api/get-wholescores?gamemode=${gamemode}&bottomRank=${bottomRank}`)
      if (!response.ok) { throw new Error('Request failed'); }
      const data = await response.json();
      // console.log(data);
      return data;
    } catch (error) {
      console.error(error);
    }
  }

  async updateWholeRank(gamemode: string) {
    try {
      const response = await fetch(`/api/update-wholerank?gamemode=${gamemode}`);
      if (!response.ok) { throw new Error('Request failed'); }
    } catch (error) { console.error(error) };
  }

  async updateSeasonRank(year, minMonth, maxMonth, gamemode: string) {
    try {
      const response = await fetch(`/api/update-seasonrank?year=${year}&minMonth=${minMonth}&maxMonth=${maxMonth}&gamemode=${gamemode}`)
      if (!response.ok) { throw new Error('Request failed'); }
    } catch (error) { console.error(error) };
  }


  async addData(userName: string, playDuration: string, gamemode: string, captchaResponse: string) {
    try {
      const createdAt = this.getCurrentTimestamp();

      const response = await fetch(`/api/add-scores`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userName: userName,
          playDuration: playDuration,
          gameMode: gamemode,
          createdAt: createdAt,
          captchaResponse: captchaResponse,
        }),
      })
      if (!response.ok) {
        throw new Error('Request failed');
      }
      // const data = await response.json();
      // console.log(data);
    } catch (error) {
      console.error(error);
      throw new Error('error when inserting score');
    }
  }

  async getNextWholeRank(playDuration: string, gamemode: string) {
    try {
      const response = await fetch(`/api/get-nextwholerank?playDuration=${playDuration}&gamemode=${gamemode}`)
      if (!response.ok) {
        throw new Error('Request failed');
      }
      const data = await response.json();
      const rankToEnter = Number(data?.scores?.rows[0].next_rank ?? 0) + 1;
      // console.log(rankToEnter);
      return rankToEnter;
    } catch (error) {
      console.error(error);
      throw new Error('error when getting whole rank');
    }
  }

  async getNextSeasonRank(year: number, minMonth: number, maxMonth: number, playDuration: string, gamemode: string) {
    try {
      const response = await fetch(`/api/get-nextseasonrank?year=${year}&minMonth=${minMonth}&maxMonth=${maxMonth}&playDuration=${playDuration}&gamemode=${gamemode}`)
      if (!response.ok) {
        throw new Error('Request failed');
      }
      const data = await response.json();

      const rankToEnter = Number(data?.scores?.rows[0].next_rank ?? 0) + 1;
      // console.log(rankToEnter);
      return rankToEnter;
    } catch (error) {
      console.error(error);
      throw new Error('error when getting season rank');
    }
  }

  // this is for test/debug
  async addDataWithTimestamp(userName, playDuration, timestamp, gamemode) {
    try {
      const response = await fetch(`/api/add-scores-withtimestamp?userName=${userName}&playDuration=${playDuration}&timestamp=${timestamp}&gamemode=${gamemode}`)
      if (!response.ok) {
        throw new Error('Request failed');
      }
      // const data = await response.json();
      // console.log(data);
    } catch (error) {
      console.error(error);
    }
  }

  // this is for test/debug
  async addManyDatas() {
    const times = 100;

    for (let n = 0; n < times; n++) {
      const hours = Math.floor(Math.random() * 24);
      const minutes = Math.floor(Math.random() * 60);
      const seconds = Math.floor(Math.random() * 60);
      const year = Math.floor(Math.random() * 2) + 2023;
      const month = this.addLeadingZero(Math.floor(Math.random() * 12) + 1);
      const day = this.addLeadingZero(Math.floor(Math.random() * 30) + 1);

      const userName = this.generateRandomString(Math.floor(Math.random() * 5) + 1);
      const playDuration = `${hours} hours ${minutes} minutes ${seconds} seconds`;
      // '2023-07-15T21:45:23.826Z'
      const timestamp = `${year}-${month}-${day}T21:45:23.826Z`;
      const gamemode1 = `${gameConfig.ENDURANCE_TOTAL1}-mode1`; // equal to getendurancemode1
      const gamemode2 = `${gameConfig.ENDURANCE_TOTAL2}-mode2`; // equal to getendurancemode2
      const gamemode = Math.floor(Math.random() * 2) === 0 ? gamemode1 : gamemode2;

      await this.addDataWithTimestamp(userName, playDuration, timestamp, gamemode);
    }

    console.log('inserting data is done?') // this comes first, of course

  }

  private generateRandomString(length) {
    let result = '';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789あいうえお田中鈴木中村高橋';
    const charactersLength = characters.length;

    for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }

    return result;
  }

  private addLeadingZero(number) {
    if (number < 10) {
      return '0' + number;
    }
    return number.toString();
  }

  async addDataWithRetry(userName: string, playDuration: string, gamemode: string, captchaResponse: string): Promise<void> {
    return this.dataOpeWithRetry(async () => this.addData(userName, playDuration, gamemode, captchaResponse)) as Promise<void>;
  }
  async getNextWholeRankWithRetry(playDuration: string, gamemode: string): Promise<number> {
    return this.dataOpeWithRetry(async () => this.getNextWholeRank(playDuration, gamemode)) as Promise<number>;
  }
  async getNextSeasonRankWithRetry(year: number, minMonth: number, maxMonth: number, playDuration: string, gamemode: string): Promise<number> {
    return this.dataOpeWithRetry(async () => this.getNextSeasonRank(year, minMonth, maxMonth, playDuration, gamemode)) as Promise<number>;
  }

  // Retry configuration
  private _maxRetries = 5; // Maximum number of retries
  private _baseDelay = 1000; // Initial delay in milliseconds
  private _backoffFactor = 2; // Backoff factor for exponential increase

  async dataOpeWithRetry(dataOpeCallback: () => Promise<void> | Promise<number>): Promise<number | void> {
    let retries = 0;
    let delay = this._baseDelay;

    while (retries < this._maxRetries) {
      try {
        const res = await dataOpeCallback();

        return res; //break; ???
      } catch (error) {
        console.error('Database operation failed:', error);

        if (retries === this._maxRetries - 1) {
          throw error;
        }

        // Calculate the delay for the next retry using exponential backoff
        const backoffDelay = delay * Math.pow(this._backoffFactor, retries);

        console.log(`Retrying in ${backoffDelay} milliseconds...`);
        await new Promise(resolve => setTimeout(resolve, backoffDelay));

        retries++;
      }
    }

    console.error('Maximum number of retries reached. Database operation failed.');
  }

  private getCurrentTimestamp() {
    const now = Date.now()
    const date = new Date(now);

    const formattedDate = date.toLocaleString('en-CA', {
      // timeZone: 'UTC',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).replace(',', '');

    return formattedDate;
  }


  // unused, execute from command
  // async createTable() {
  //   try {
  //     const response = await fetch('/api/create-scores-table');
  //     if (!response.ok) { throw new Error('Request failed'); }
  //   } catch (error) { console.error(error) };
  // }

  // async deleteTable() {
  //   try {
  //     const response = await fetch('/api/delete-scores-table');
  //     if (!response.ok) { throw new Error('Request failed'); }
  //   } catch (error) { console.error(error) };
  // }

  // async deleteAllData() {
  //   try {
  //     const response = await fetch('/api/delete-scores-data');
  //     if (!response.ok) { throw new Error('Request failed'); }
  //   } catch (error) { console.error(error) };
  // }
}
