export class ApiHandle {


  async fetchData(year, minMonth, maxMonth, bottomRank) {
    try {
      const response = await fetch(`/api/get-scores?year=${year}&minMonth=${minMonth}&maxMonth=${maxMonth}&bottomRank=${bottomRank}`)
      if (!response.ok) {
        throw new Error('Request failed');
      }
      const data = await response.json();
      // console.log(data);
      return data;
    } catch (error) {
      console.error(error);
    }
  }

  createTable() {
    fetch('/api/create-scores-table')
      .then(response => response.json())
      .then(data => { console.log(data); })
      .catch(error => console.error(error));
  }

  deleteTable() {
    fetch('/api/delete-scores-table')
      .then(response => response.json())
      .then(data => { console.log(data); })
      .catch(error => console.error(error));
  }

  deleteAllData() {
    fetch('/api/delete-scores-data')
      .then(response => response.json())
      .then(data => { console.log(data); })
      .catch(error => console.error(error));
  }

  async updateWholeRank() {
    try {
      const response = await fetch('/api/update-wholerank');
      if (!response.ok) { throw new Error('Request failed'); }
    } catch (error) { console.error(error) };
  }

  async updateSeasonRank(year, minMonth, maxMonth) {
    try {
      const response = await fetch(`/api/update-seasonrank?year=${year}&minMonth=${minMonth}&maxMonth=${maxMonth}`)
      if (!response.ok) { throw new Error('Request failed'); }
    } catch (error) { console.error(error) };
  }


  async addData(userName, playDuration, gamemode) {
    try {
      const response = await fetch(`/api/add-scores?userName=${userName}&playDuration=${playDuration}&gamemode=${gamemode}`)
      if (!response.ok) {
        throw new Error('Request failed');
      }
      // const data = await response.json();
      // console.log(data);
    } catch (error) {
      console.error(error);
    }
  }

  async getNextWholeRank(playDuration) {
    try {
      const response = await fetch(`/api/get-nextwholerank?playDuration=${playDuration}`)
      if (!response.ok) {
        throw new Error('Request failed');
      }
      const data = await response.json();
      const rankToEnter = Number(data.scores.rows[0].next_rank) + 1;
      // console.log(rankToEnter);
      return rankToEnter;
    } catch (error) {
      console.error(error);
    }
  }

  async getNextSeasonRank(year, minMonth, maxMonth, playDuration) {
    try {
      const response = await fetch(`/api/get-nextseasonrank?year=${year}&minMonth=${minMonth}&maxMonth=${maxMonth}&playDuration=${playDuration}`)
      if (!response.ok) {
        throw new Error('Request failed');
      }
      const data = await response.json();
      const rankToEnter = Number(data.scores.rows[0].next_rank) + 1;
      // console.log(rankToEnter);
      return rankToEnter;
    } catch (error) {
      console.error(error);
    }
  }

  // this is for test/debug
  addDataWithTimestamp(userName, playDuration, timestamp, gamemode) {
    fetch(`/api/add-scores-withtimestamp?userName=${userName}&playDuration=${playDuration}&timestamp=${timestamp}&gamemode=${gamemode}`)
      .then(response => response.json())
      .then(data => { console.log(data); })
      .catch(error => console.error(error));
  }

  // this is for test/debug
  addManyDatas() {
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
      const gamemode = 'gamemode1';

      this.addDataWithTimestamp(userName, playDuration, timestamp, gamemode);
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

  // Retry configuration
  private _maxRetries = 5; // Maximum number of retries
  private _baseDelay = 1000; // Initial delay in milliseconds
  private _backoffFactor = 2; // Backoff factor for exponential increase

  async addDataWithRetry(userName, playDuration, gamemode) { //:Promise<number> {
    let retries = 0;
    let delay = this._baseDelay;

    while (retries < this._maxRetries) {
      try {
        await this.addData(userName, playDuration, gamemode);

        return; //break; ???
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

}