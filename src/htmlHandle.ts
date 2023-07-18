import { ApiHandle } from "./apiHandle";
import { Chain } from "./chain";
import { GameMode, Mountain } from "./mountain";
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
    this._timerElement = document.getElementById('timer');

    // this._pauseButton.addEventListener('click', this.handlePause);
    // document.addEventListener('keydown', e => {
    //   if (e.key === 'p') this.handlePause();
    // })
  }

  htmlUpdate() {
    if (!stateHandle.willShowGameResult()) {
      this._chainNumShow.style.display = 'none';
      this._chainPuyoNumShow.style.display = 'none';
      this._targetChainNumShow.style.display = 'none';
      this._timerElement.style.display = 'none';
    } else {
      this._chainNumShow.style.display = '';
      this._chainPuyoNumShow.style.display = '';
      this._targetChainNumShow.style.display = '';
      this._timerElement.style.display = '';
    }

    if (this._mountain.currentMode === GameMode.ARCADE) {
      this._targetChainNumShow.textContent = `**${this._mountain.currentTargetChainNum} 連鎖せよ！** 　 フェーズ ${this._mountain.phase}`
    } else if (this._mountain.currentMode === GameMode.ENDURANCE) {
      this._targetChainNumShow.textContent = `**${this._mountain.currentTargetChainNum} 連鎖せよ！** 現在 ${this._mountain.totalChainNum} / ${this._mountain.enduranceTotalTargetChainNum}`
    }
    this._chainNumShow.textContent = `${this._chain.chainCount} 連鎖    最大${this._chain.maxVirtualChainCount}連鎖可能`
    this._chainPuyoNumShow.textContent = `有効連鎖ぷよ数: ${this._mountain.validVanishPuyoNum} 不要連鎖ぷよ数: ${this._mountain.unnecessaryVanishPuyoNum}`
    this._timerElement.innerText = this._timer.formattedTime;

    // if (stateHandle.checkCurrentState(GameState.GAMECLEAR) || stateHandle.checkCurrentState(GameState.MENU)) {
    //   const resultTime: string = this._formattedTime;
    //   const mainCanvas = document.getElementById('mainCanvas') as HTMLCanvasElement;
    //   const ctx = mainCanvas.getContext('2d');
    //   ctx.fillStyle = "lightblue";
    //   ctx.fillRect(0, 0, mainCanvas.width, mainCanvas.height);
    //   ctx.font = "24px Arial";
    //   ctx.fillStyle = "black";
    //   const resultScore = `　総合スコア　${this._mountain.resultGrade}`;
    //   const resultPlayTime = `　プレイ時間　${this._formattedTime}`
    //   const resultUnne = `　不要に消したぷよ数　${this._mountain.unnecessaryVanishPuyoNum}`
    //   ctx.fillText(resultScore, 0, 100, 160);
    //   ctx.fillText(resultPlayTime, 0, 200, 160);
    //   ctx.fillText(resultUnne, 0, 300, 160);
    // }

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
    const bottomRank = 30; // TODO: consider proper place not here
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
      whatRankDiv.textContent =
        `今回のタイム${hours}h${minutes}m${seconds}s\n
      総合${wholeRankToEnter}位　シーズン${seasonRankToEnter}位にランクインしました`;
      rankInDialog.appendChild(whatRankDiv);

      const inputLabel = document.createElement("label");
      inputLabel.setAttribute("for", "userInput");
      inputLabel.textContent = "ユーザーネームを入力してください(10文字以内)";
      rankInDialog.appendChild(inputLabel);

      const userInput = document.createElement("input");
      userInput.setAttribute("type", "text");
      userInput.setAttribute("id", "userInput");
      userInput.setAttribute("maxlength", "10");
      userInput.required = true; // this time "submit" isn't used so this is unnecessary
      rankInDialog.appendChild(userInput);

      const sendButton = document.createElement("button");
      sendButton.textContent = "送信する";
      sendButton.addEventListener("click", (e) => { // async
        e.preventDefault(); // We don't want to submit this fake form

        const userInput = document.getElementById("userInput") as HTMLInputElement;
        const userName = userInput.value;

        if (!userName || (userName === '')) {
          alert('名前を入力してください!')
          return;
        }
        // TODO: implement retry process
        // await this._apiHandle.addData(userName, playDuration, gamemode)
        this._apiHandle.addDataWithRetry(userName, playDuration, gamemode)
          .then(() => {
            rankInDialog.innerHTML = '';
            rankInDialog.innerText = 'データを送信しました'
            this.addCloseButton(rankInDialog);
          })
          .catch((error) => {
            // TODO: how to verify this case
            console.error(error);
            rankInDialog.innerHTML = '';
            rankInDialog.innerText = '問題が発生しました、管理者に問い合わせてください'
            this.addCloseButton(rankInDialog);
          })

        // rankInDialog.close(userName);
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
      rankInDialog.innerText =
        `今回のタイム${hours}h${minutes}m${seconds}s 
      今回はランク外でした`
      this.addCloseButton(rankInDialog);
    }

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
    const bottomRank = 30; // TODO: consider proper place not here
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
    scoresOutput.classList.add('scrollable-container');

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
    for (let item of data.scores.rows) {
      const li = document.createElement('li');
      li.textContent =
        `WR:${item.wholerank} SR:${item.seasonrank} 
        UN:${item.username} PD:${item.playduration.hours || '0'}:${item.playduration.minutes || '00'}:${item.playduration.seconds || '00'} 
        WHEN:${item.createdat.split('T')[0]}`;
      dynamicContent.appendChild(li);
    }
  }
}
