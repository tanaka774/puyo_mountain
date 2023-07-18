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
  // private _startTime: number;
  // private _currentTime: number;
  // private _timerStarted: boolean;
  // private _formattedTime: string;
  // private _pauseButton: HTMLElement;

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
    // this._formattedTime = '00:00';
    // this._timerStarted = false;
    // this._pauseButton = document.getElementById("pauseButton");

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
    const bottomRank = 10; // TODO: consider proper place not here
    const gamemode = 'gamemode1';


    const rankInDialog = document.createElement("dialog");
    document.body.appendChild(rankInDialog);

    rankInDialog.showModal();

    const seasonRankToEnter = await this._apiHandle.getNextSeasonRank(year, month, month + 2, playDuration);
    const wholeRankToEnter = await this._apiHandle.getNextWholeRank(playDuration);

    const whatRankDiv = document.createElement("div");
    whatRankDiv.textContent = `総合${wholeRankToEnter}位　シーズン${seasonRankToEnter}位にランクインしました`;
    rankInDialog.appendChild(whatRankDiv);

    // "Cancel" button closes the dialog without submitting because of [formmethod="dialog"], triggering a close event.
    rankInDialog.addEventListener("close", async (e) => {
      // unused?
    });

    if (seasonRankToEnter <= bottomRank) {

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
      sendButton.addEventListener("click", async (e) => {
        e.preventDefault(); // We don't want to submit this fake form

        const userInput = document.getElementById("userInput") as HTMLInputElement;
        const userName = userInput.value;

        if (!userName || (userName === '')) {
          alert('名前を入力してください!')
          return;
        }
        // TODO: implement retry process
        await this._apiHandle.addData(userName, playDuration, gamemode)

        rankInDialog.innerHTML = '';
        rankInDialog.innerText = 'データを送信しました'
        this.addCloseButton(rankInDialog);
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
      this.addCloseButton(rankInDialog);
    }

  }

  private addCloseButton(rankInDialog: HTMLDialogElement) {
    const closeButton = document.createElement("button");
    closeButton.textContent = "閉じる";
    closeButton.addEventListener("click", (e) => {
      e.preventDefault();
      rankInDialog.close();
    });
    rankInDialog.appendChild(closeButton);
  }
}
