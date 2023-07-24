import { ApiHandle } from "./apiHandle";
import { Chain } from "./chain";
import { gameConfig } from "./config";
import { GameMode, Mountain } from "./mountain/mountain";
import { Difficulty } from "./mountain/mountainArcade";
import { GameState, stateHandle } from "./state";
import { Timer } from "./timer";


export class HtmlHandle {
  private _targetChainNumShow: HTMLElement;
  private _chainNumShow: HTMLElement;
  private _chainPuyoNumShow: HTMLElement;
  private _timerElement: HTMLElement;

  constructor(
    private _apiHandle: ApiHandle,
    private _timer: Timer,
    private _chain: Chain,
    private _mountain: Mountain,
  ) {
    this._targetChainNumShow = document.getElementById("targetChainCount");
    this._chainNumShow = document.getElementById("chainCount");
    this._chainPuyoNumShow = document.getElementById("chainPuyoNum");
    this._chainPuyoNumShow.style.display = 'none'; // unused??
    this._timerElement = document.getElementById('timer');

    // this._pauseButton.addEventListener('click', this.handlePause);
    // document.addEventListener('keydown', e => {
    //   if (e.key === 'p') this.handlePause();
    // })
  }

  htmlUpdate() {
    if (!stateHandle.willShowGameResult()) {
      this._chainNumShow.style.display = 'none';
      // this._chainPuyoNumShow.style.display = 'none';
      this._targetChainNumShow.style.display = 'none';
      this._timerElement.style.display = 'none';
    } else {
      this._chainNumShow.style.display = '';
      // this._chainPuyoNumShow.style.display = '';
      this._targetChainNumShow.style.display = '';
      this._timerElement.style.display = '';
    }

    if (this._mountain.currentMode === GameMode.ARCADE) {
      if (this._mountain.isLastPhase() && this._mountain.checkDifficulty(Difficulty.HARD)) {
        this._targetChainNumShow.textContent = `${this._mountain.currentTargetChainNum} 連鎖全消しすべし`
      } else {
        this._targetChainNumShow.textContent = `${this._mountain.currentTargetChainNum} 連鎖すべし フェーズ ${this._mountain.phase}`
      }
    } else if (this._mountain.currentMode === GameMode.ENDURANCE) {
      this._targetChainNumShow.textContent = `${this._mountain.currentTargetChainNum} 連鎖すべし 　${this._mountain.totalChainNum} / ${this._mountain.enduranceTotalTargetChainNum}`
    }
    // this._chainNumShow.textContent = ` 最大${this._chain.maxVirtualChainCount}連鎖可能`
    this._chainNumShow.textContent = `MAX: ${this._chain.maxVirtualChainCount}`
    // this._chainPuyoNumShow.textContent = `有効連鎖ぷよ数: ${this._mountain.validVanishPuyoNum} 不要連鎖ぷよ数: ${this._mountain.unnecessaryVanishPuyoNum}`
    this._timerElement.innerText = this._timer.formattedTime;


  }

  // handlePause() {
  //   // TODO: temp, prevent infinte loop
  //   if (GameState.currentState === GameState.JUST_DRAWING) return;
  //
  //   if (GameState.currentState !== GameState.PAUSING) stateHandle.setState(GameState.PAUSING);
  //   else stateHandle.setState(stateHandle.prevState);
  // }

  async showRankInModal() { // (wholeRank, seasonRank, isInHighScore:boolean, playDuration, gamemode) {

    const [hours, minutes, seconds] = this._timer.getElapsedTimeDigits();
    const playDuration = `${hours} hours ${minutes} minutes ${seconds} seconds`
    const currentDate = new Date();
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1;
    const bottomRank = gameConfig.BOTTOM_SCORE_RANK;
    const gamemode = 'gamemode1';

    const rankInDialog = document.createElement("dialog");
    document.body.appendChild(rankInDialog);

    rankInDialog.showModal();
    // "Cancel" button closes the dialog without submitting because of [formmethod="dialog"], triggering a close event.
    rankInDialog.addEventListener("close", async (e) => {
      // unused?
    });

    const seasonRankToEnter = await this._apiHandle.getNextSeasonRank(year, month, month + 2, playDuration);
    const wholeRankToEnter = await this._apiHandle.getNextWholeRank(playDuration);

    if (seasonRankToEnter <= bottomRank) {
      const whatRankDiv = document.createElement("div");
      // TODO: want to separate line!
      whatRankDiv.innerHTML =
        `今回のタイム${hours}h${minutes}m${seconds}s <br>
      総合${wholeRankToEnter}位　シーズン${seasonRankToEnter}位にランクインしました <br>`;
      rankInDialog.appendChild(whatRankDiv);

      const inputLabel = document.createElement("label");
      inputLabel.setAttribute("for", "userInput");
      inputLabel.innerHTML = "ユーザーネームを入力してください(10文字以内)<br>";
      rankInDialog.appendChild(inputLabel);

      const tempDiv = document.createElement("div");
      const userInput = document.createElement("input");
      userInput.setAttribute("type", "text");
      userInput.setAttribute("id", "userInput");
      userInput.setAttribute("maxlength", "10");
      userInput.required = true; // this time "submit" isn't used so this is unnecessary
      tempDiv.appendChild(userInput);
      rankInDialog.appendChild(tempDiv);

      const sendButton = document.createElement("button");
      sendButton.textContent = "送信する";
      sendButton.addEventListener("click", (e) => { // async
        e.preventDefault(); // We don't want to submit this fake form
        // TODO: prevent multiple clicks

        const userInput = document.getElementById("userInput") as HTMLInputElement;
        const userName = userInput.value;

        if (!userName || (userName === '')) {
          alert('名前を入力してください!')
          return;
        }

        this._apiHandle.addDataWithRetry(userName, playDuration, gamemode)
          .then(() => {
            rankInDialog.innerHTML = '';
            rankInDialog.innerText = 'データを送信しました'
            this.addCloseButton(rankInDialog);

            // update after inserting data, welcome to callback hell
            this._apiHandle.updateWholeRank()
              .then(() => {
                this._apiHandle.updateSeasonRank(year, month, month + 2)
                  .then(() => { })
                  .catch((err) => { console.error(err); })
              })
              .catch((err) => { console.error(err); })
          })
          .catch((error) => {
            console.error(error);
            rankInDialog.innerHTML = '';
            rankInDialog.innerHTML = `問題が発生しました、管理者に問い合わせてください <br>今回のタイム${hours}h${minutes}m${seconds}s`;
            this.addCloseButton(rankInDialog);
          })

      });
      rankInDialog.appendChild(sendButton);

      const notSendButton = document.createElement("button");
      notSendButton.textContent = "送信しない";
      notSendButton.addEventListener("click", (e) => {
        e.preventDefault();
        const result = confirm("今回の記録は残りませんがよろしいですか?");
        if (result) {
          // User clicked "OK"
          rankInDialog.close();
        } else {
          // User clicked "Cancel"
        }
      });
      rankInDialog.appendChild(notSendButton);

    } else {
      rankInDialog.innerHTML =
        `今回のタイム${hours}h${minutes}m${seconds}s <br>
      今回はランク外でした<br>`
      this.addCloseButton(rankInDialog);
    }

  }


  async showHighScoresModal() {
    const highScoreDialog = document.createElement("dialog");
    document.body.appendChild(highScoreDialog);

    highScoreDialog.showModal();

    highScoreDialog.addEventListener("close", async (e) => {
      // unused?
    });

    const addOption = (text, value, select: HTMLSelectElement) => {
      const newOption = document.createElement('option');
      newOption.textContent = text;
      newOption.value = value;
      select.appendChild(newOption);
    }

    const startYear = 2023;
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;
    const bottomRank = gameConfig.BOTTOM_SCORE_RANK; // TODO: consider proper place not here
    const gamemode = 'gamemode1';

    const wholeSelect = document.createElement("select");
    addOption('総合', 'whole', wholeSelect);
    addOption('シーズン', 'season', wholeSelect);
    const yearSelect = document.createElement("select");
    addOption('選ぶ', 'default', yearSelect);
    for (let y = startYear; y <= currentYear; y++) {
      addOption(`${y}`, `${y}`, yearSelect);
    }
    const monthSelect = document.createElement("select");
    addOption('選ぶ', 'default', monthSelect);
    addOption('1-3', 'spring', monthSelect);
    addOption('4-6', 'summer', monthSelect);
    addOption('7-9', 'autumn', monthSelect);
    addOption('10-12', 'winter', monthSelect);
    const modeSelect = document.createElement("select");
    // addOption('選ぶ', 'default', modeSelect);
    addOption('mode1', 'mode1', modeSelect);
    addOption('mode2', 'mode2', modeSelect);
    const scoresOutput = document.createElement("output");
    scoresOutput.classList.add('score-container');

    // TODO: try-catch?
    wholeSelect.addEventListener('change', async () => {
      const selectedValue = wholeSelect.value;
      let data;
      if (selectedValue === 'whole') {
        yearSelect.value = 'default';
        monthSelect.value = 'default';
        data = await this._apiHandle.fetchData('0', '0', '0', bottomRank);
      } else if (selectedValue === 'season') {
        yearSelect.value = currentYear.toString();
        const minMonth = currentMonth - ((currentMonth % 3 + 2) % 3);
        monthSelect.value =
          (minMonth === 1) ? "spring" :
            (minMonth === 4) ? "summer" :
              (minMonth === 7) ? "autumn" :
                (minMonth === 10) ? "winter" : "default";

        data = await this._apiHandle.fetchData(currentYear, minMonth, minMonth + 2, bottomRank);
      }
      this.makeContentFromDB(scoresOutput, data);
    })

    yearSelect.addEventListener('change', async () => {
      if (yearSelect.value === 'default' || monthSelect.value === 'default') return;

      const monthRange = monthSelect.options[monthSelect.selectedIndex].textContent;
      const minMonth = monthRange.split("-")[0];
      const maxMonth = monthRange.split("-")[1];
      const data = await this._apiHandle.fetchData(yearSelect.value, minMonth, maxMonth, bottomRank);
      this.makeContentFromDB(scoresOutput, data);
    })

    monthSelect.addEventListener('change', async () => {
      if (yearSelect.value === 'default' || monthSelect.value === 'default') return;

      const monthRange = monthSelect.options[monthSelect.selectedIndex].textContent;
      const minMonth = monthRange.split("-")[0];
      const maxMonth = monthRange.split("-")[1];
      const data = await this._apiHandle.fetchData(yearSelect.value, minMonth, maxMonth, bottomRank);
      this.makeContentFromDB(scoresOutput, data);
    })

    modeSelect.addEventListener('change', () => {
      // TODO:
    })

    highScoreDialog.appendChild(wholeSelect);
    highScoreDialog.appendChild(yearSelect);
    highScoreDialog.appendChild(monthSelect);
    highScoreDialog.appendChild(modeSelect);
    highScoreDialog.appendChild(scoresOutput);
    this.addCloseButton(highScoreDialog);
    const firstDataToShow = await this._apiHandle.fetchData('0', '0', '0', bottomRank);
    this.makeContentFromDB(scoresOutput, firstDataToShow);
  }

  private makeContentFromDB(dynamicContent: HTMLElement, data) {
    dynamicContent.innerHTML = '';

    // for (let item of data.scores.rows) {
    // const li = document.createElement('li');
    // li.textContent =
    //   `UN:${item.username} WR:${item.wholerank} SR:${item.seasonrank} 
    //   PD:${item.playduration.hours || '0'}:${item.playduration.minutes || '00'}:${item.playduration.seconds || '00'} 
    //   WHEN:${item.createdat.split('T')[0]}`;
    // dynamicContent.appendChild(li);
    // }

    const scoreTable = document.createElement('table');
    scoreTable.innerHTML = `
      <thead>
        <tr>
          <th>名前</th>
          <th>総合</th>
          <th>シーズン</th>
          <th>タイム</th>
          <th>達成日</th>
        </tr>
      </thead>
      <tbody>
        ${data.scores.rows.map(entry => `
          <tr>
            <td>${entry.username}</td>
            <td>${entry.wholerank}</td>
            <td>${entry.seasonrank}</td>
            <td>${entry.playduration.hours || '0'}:${entry.playduration.minutes || '00'}:${entry.playduration.seconds || '00'}</td>
            <td>${entry.createdat.split('T')[0]}</td>
          </tr>
        `).join('')}
      </tbody>
    `;
    scoreTable.style.backgroundColor = 'black';
    dynamicContent.appendChild(scoreTable);

    // data.scores.rows.forEach(entry => {
    //   const div = document.createElement('div');
    //   div.textContent = `${entry.username}, ${entry.wholerank}, ${entry.seasonrank}`;
    //   dynamicContent.appendChild(div);
    // });
  }

  showArcadeResult() {
    const [hours, minutes, seconds] = this._timer.getElapsedTimeDigits();
    const playDuration = `${hours}h ${minutes}m ${seconds}s`
    const resultDialog = document.createElement("dialog");
    document.body.appendChild(resultDialog);
    resultDialog.showModal();
    resultDialog.addEventListener("close", async (e) => {
      // unused?
    });

    const resultScore = `総合スコア ${this._mountain.resultGrade}<br><br><br><br>`;
    const resultPlayTime = `プレイ時間 ${playDuration}<br><br>`
    const resultUnne = `不要に消したぷよ数 ${this._mountain.unnecessaryVanishPuyoNum}<br><br>`

    const tempDiv = document.createElement('div');
    tempDiv.style.fontSize = "26px"
    tempDiv.innerHTML = `${resultScore}${resultPlayTime}${resultUnne}`;
    resultDialog.appendChild(tempDiv);
    this.addCloseButton(resultDialog);

    // const resultTime: string = this._formattedTime;
    // const mainCanvas = document.getElementById('mainCanvas') as HTMLCanvasElement;
    // const ctx = mainCanvas.getContext('2d');
    // ctx.fillStyle = "lightblue";
    // ctx.fillRect(0, 0, mainCanvas.width, mainCanvas.height);
    // ctx.font = "24px Arial";
    // ctx.fillStyle = "black";
    // const resultScore = `　総合スコア　${this._mountain.resultGrade}`;
    // const resultPlayTime = `　プレイ時間　${this._formattedTime}`
    // const resultUnne = `　不要に消したぷよ数　${this._mountain.unnecessaryVanishPuyoNum}`
    // ctx.fillText(resultScore, 0, 100, 160);
    // ctx.fillText(resultPlayTime, 0, 200, 160);
    // ctx.fillText(resultUnne, 0, 300, 160);
  }

  private addCloseButton(dialogElement: HTMLDialogElement) {
    const closeButton = document.createElement("button");
    closeButton.textContent = "閉じる";
    closeButton.addEventListener("click", (e) => {
      e.preventDefault();
      dialogElement.close();
    });
    dialogElement.appendChild(closeButton);
  }
}
