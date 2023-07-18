export class ApiHandle {


  fetchData(year, minMonth, maxMonth, bottomRank) {
    const dynamicContent = document.getElementById('api-test');

    // Make an AJAX request to fetch the data from the backend
    fetch(`/api/get-scores?year=${year}&minMonth=${minMonth}&maxMonth=${maxMonth}&bottomRank=${bottomRank}`)
      .then(response => response.json())
      .then(data => {
        console.log(data);
        // TODO: show data in proper order (sometimes comes in wrong order)
        for (let item of data.scores.rows) {
          const li = document.createElement('li');
          li.textContent = `WR:${item.wholerank} SR:${item.seasonrank} UN:${item.username} PD:${item.playduration.hours || '0'}:${item.playduration.minutes || '00'}:${item.playduration.seconds || '00'} WHEN:${item.createdat.split('T')[0]}`;
          dynamicContent.appendChild(li);
        }
      })
      .catch(error => console.error(error));
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

  updateWholeRank() {
    fetch('/api/update-wholerank')
      .then(response => response.json())
      .then(data => { console.log(data); })
      .catch(error => console.error(error));
  }

  updateSeasonRank(year, minMonth, maxMonth) {
    fetch(`/api/update-seasonrank?year=${year}&minMonth=${minMonth}&maxMonth=${maxMonth}`)
      .then(response => response.json())
      .then(data => { console.log(data); })
      .catch(error => console.error(error));
  }


  async addData(userName, playDuration, gamemode) {
    try {
      const response = await fetch(`/api/add-scores?userName=${userName}&playDuration=${playDuration}&gamemode=${gamemode}`)
      if (!response.ok) {
        throw new Error('Request failed');
      }
      const data = await response.json();
      console.log(data);
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
}