import { ApiHandle } from "./apiHandle";
import { Chain } from "./chain";
import { PUYO_COLORS, gameConfig } from "./config";
import { LSHandle } from "./localStorageHandle";
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
    private _lSHandle: LSHandle,
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

    this._targetChainNumShow.textContent = this._mountain.getGameStatus();
    // this._chainNumShow.textContent = ` 最大${this._chain.maxVirtualChainCount}連鎖可能`
    this._chainNumShow.textContent = `MAX: ${this._chain.maxVirtualChainCount}`
    // this._chainPuyoNumShow.textContent = `有効連鎖ぷよ数: ${this._mountain.validVanishPuyoNum} 不要連鎖ぷよ数: ${this._mountain.unnecessaryVanishPuyoNum}`
    this._timerElement.innerText = this._timer.formattedTime;
  }

  async showRankInModal() { // (wholeRank, seasonRank, isInHighScore:boolean, playDuration, gamemode) {

    const [hours, minutes, seconds] = this._timer.getElapsedTimeDigits();
    const playDuration = `${hours} hours ${minutes} minutes ${seconds} seconds`
    const currentDate = new Date();
    const year = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;
    const minMonth = currentMonth - ((currentMonth % 3 + 2) % 3);
    const bottomRank = gameConfig.BOTTOM_SCORE_RANK;
    const gamemode = this._mountain.getEnduraceMode();

    const rankInDialog = document.createElement("dialog");
    document.body.appendChild(rankInDialog);

    rankInDialog.showModal();
    // "Cancel" button closes the dialog without submitting because of [formmethod="dialog"], triggering a close event.
    rankInDialog.addEventListener("close", async (e) => {
      // unused?
    });

    const seasonRankToEnter = await this._apiHandle.getNextSeasonRank(year, minMonth, minMonth + 2, playDuration, gamemode);
    const wholeRankToEnter = await this._apiHandle.getNextWholeRank(playDuration, gamemode);

    if (seasonRankToEnter <= bottomRank) {
      const whatRankDiv = document.createElement("div");
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
        sendButton.disabled = true;

        const userInput = document.getElementById("userInput") as HTMLInputElement;
        const userName = userInput.value;

        if (!userName || (userName === '')) {
          alert('名前を入力してください!');
          sendButton.disabled = false;
          return;
        }

        this._apiHandle.addDataWithRetry(userName, playDuration, gamemode)
          .then(() => {
            rankInDialog.innerHTML = '';
            rankInDialog.innerText = 'データを送信しました'
            this.addCloseButton(rankInDialog);

            // update after inserting data, welcome to callback hell
            this._apiHandle.updateWholeRank(gamemode)
              .then(() => {
                this._apiHandle.updateSeasonRank(year, minMonth, minMonth + 2, gamemode)
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
          .finally(() => {
            sendButton.disabled = false
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
    const bottomRank = gameConfig.BOTTOM_SCORE_RANK;
    const gamemode1 = `${gameConfig.ENDURANCE_TOTAL1}-mode1`; // equal to getendurancemode1
    const gamemode2 = `${gameConfig.ENDURANCE_TOTAL2}-mode2`; // equal to getendurancemode2
    let gamemode = gamemode1;

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
    // TODO: change gamemode according to select
    addOption('ケーツー', gamemode1, modeSelect);
    addOption('mode2', gamemode2, modeSelect);
    const scoresOutput = document.createElement("output");
    scoresOutput.classList.add('score-container');

    // TODO: try-catch?
    wholeSelect.addEventListener('change', async () => {
      const selectedValue = wholeSelect.value;
      let data;
      if (selectedValue === 'whole') {
        yearSelect.value = 'default';
        monthSelect.value = 'default';
        data = await this._apiHandle.fetchWholeData(gamemode, bottomRank);
      } else if (selectedValue === 'season') {
        yearSelect.value = currentYear.toString();
        const minMonth = currentMonth - ((currentMonth % 3 + 2) % 3);
        monthSelect.value =
          (minMonth === 1) ? "spring" :
            (minMonth === 4) ? "summer" :
              (minMonth === 7) ? "autumn" :
                (minMonth === 10) ? "winter" : "default";

        data = await this._apiHandle.fetchSeasonData(currentYear, minMonth, minMonth + 2, gamemode, bottomRank);
      }
      this.makeContentFromDB(scoresOutput, data);
    })

    yearSelect.addEventListener('change', async () => {
      if (yearSelect.value === 'default' || monthSelect.value === 'default') return;

      const monthRange = monthSelect.options[monthSelect.selectedIndex].textContent;
      const minMonth = monthRange.split("-")[0];
      const maxMonth = monthRange.split("-")[1];
      const data = await this._apiHandle.fetchSeasonData(yearSelect.value, minMonth, maxMonth, gamemode, bottomRank);
      this.makeContentFromDB(scoresOutput, data);
    })

    monthSelect.addEventListener('change', async () => {
      if (yearSelect.value === 'default' || monthSelect.value === 'default') return;

      const monthRange = monthSelect.options[monthSelect.selectedIndex].textContent;
      const minMonth = monthRange.split("-")[0];
      const maxMonth = monthRange.split("-")[1];
      const data = await this._apiHandle.fetchSeasonData(yearSelect.value, minMonth, maxMonth, gamemode, bottomRank);
      this.makeContentFromDB(scoresOutput, data);
    })

    modeSelect.addEventListener('change', async () => {
      // TODO:
      gamemode = modeSelect.value;
      if (wholeSelect.value === 'season' && (yearSelect.value === 'default' || monthSelect.value === 'default')) return;

      if (wholeSelect.value === 'whole') {
        const data = await this._apiHandle.fetchWholeData(gamemode, bottomRank);
        this.makeContentFromDB(scoresOutput, data);
      } else if (wholeSelect.value === 'season') {
        const monthRange = monthSelect.options[monthSelect.selectedIndex].textContent;
        const minMonth = monthRange.split("-")[0];
        const maxMonth = monthRange.split("-")[1];
        const data = await this._apiHandle.fetchSeasonData(yearSelect.value, minMonth, maxMonth, gamemode, bottomRank);
        this.makeContentFromDB(scoresOutput, data);
      }
    })

    highScoreDialog.appendChild(wholeSelect);
    highScoreDialog.appendChild(yearSelect);
    highScoreDialog.appendChild(monthSelect);
    highScoreDialog.appendChild(modeSelect);
    highScoreDialog.appendChild(scoresOutput);
    this.addCloseButton(highScoreDialog);
    const firstDataToShow = await this._apiHandle.fetchWholeData(gamemode, bottomRank);
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
        </tr>
      </thead>
      <tbody>
        ${data?.scores.rows.map(entry => `
          <tr>
            <td>${entry.username}</td>
            <td>${entry.wholerank}</td>
            <td>${entry.seasonrank}</td>
            <td>${entry.playduration.hours || '0'}:${entry.playduration.minutes || '00'}:${entry.playduration.seconds || '00'}</td>
          </tr>
        `).join('')}
      </tbody>
    `;
    // reserve
    // <th>達成日</th>
    //   <td>${entry.createdat.split('T')[0]}</td>
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
    this._mountain.decideGameResult(hours, minutes, seconds);
    const playDuration = `${hours}h ${minutes}m ${seconds}s`
    const difficulty: string = (this._mountain.checkDifficulty(Difficulty.EASY)) ? 'EASY'
      : (this._mountain.checkDifficulty(Difficulty.NORMAL)) ? 'NORMAL'
        : (this._mountain.checkDifficulty(Difficulty.HARD)) ? 'HARD'
          : '';
    const resultDialog = document.createElement("dialog");
    document.body.appendChild(resultDialog);
    resultDialog.showModal();
    resultDialog.addEventListener("close", async (e) => {
      // unused?
    });

    const resultDifficulty = `難易度:${difficulty}<br><br>`;
    const resultScore = `総合スコア ${this._mountain.resultGrade}<br><br>`;
    const resultPlayTime = `プレイ時間 ${playDuration}<br><br>`
    const resultUnne = `不要に消したぷよ数 ${this._mountain.unnecessaryVanishPuyoNum}<br><br>`

    const tempDiv = document.createElement('div');
    tempDiv.style.fontSize = "26px"
    tempDiv.innerHTML = `${resultDifficulty}${resultScore}${resultPlayTime}${resultUnne}`;
    resultDialog.appendChild(tempDiv);
    this.addCloseButton(resultDialog);
  }

  showCustomConfig() {
    const configDialog = document.createElement("dialog");
    document.body.appendChild(configDialog);
    configDialog.showModal();
    configDialog.addEventListener("close", async (e) => {
      // unused?
      // configDialog.innerHTML = '';
    });

    const addOption = (text, value, select: HTMLSelectElement, isDefault = false) => {
      const newOption = document.createElement('option');
      newOption.textContent = text;
      newOption.value = value;
      newOption.selected = isDefault;
      select.appendChild(newOption);
    }

    const addLabel = (id: string, text: string, parent: HTMLElement) => {
      const inputLabel = document.createElement("label");
      inputLabel.setAttribute("for", id);
      inputLabel.innerHTML = `${text}`;
      inputLabel.style.fontSize = '20px';
      parent.appendChild(inputLabel);
    }

    const append = (element: HTMLElement) => {
      configDialog.appendChild(element);
      configDialog.appendChild(document.createElement('div'));
    }

    const puyoAmountSelect = document.createElement('select');
    puyoAmountSelect.setAttribute('id', 'puyoAmount');
    addOption('無', 'nothing', puyoAmountSelect);
    addOption('かなり少', 'pretty-small', puyoAmountSelect);
    addOption('少', 'small', puyoAmountSelect);
    addOption('標準', 'normal', puyoAmountSelect, true);
    addOption('多', 'large', puyoAmountSelect);
    addOption('かなり多', 'pretty-large', puyoAmountSelect);
    addOption('ランダム', 'random', puyoAmountSelect);
    addLabel('puyoAmount', '種ぷよの量 ', configDialog);
    // configDialog.appendChild(puyoAmountSelect);
    append(puyoAmountSelect);

    const distributionSelect = document.createElement('select');
    distributionSelect.setAttribute('id', 'distribution');
    addOption('細', 'narrow', distributionSelect);
    addOption('標準', 'normal', distributionSelect, true);
    addOption('広', 'wide', distributionSelect);
    addLabel('distribution', '種ぷよの幅 ', configDialog);
    // configDialog.appendChild(distributionSelect);
    append(distributionSelect);

    const maxNum = 20;
    const minChainNumSelect = document.createElement('select');
    distributionSelect.setAttribute('id', 'minChainNum');
    for (let n = 1; n <= maxNum; n++) {
      addOption(`${n}`, `${n}`, minChainNumSelect);
    }
    addLabel('minChainNum', '最小必要連鎖数 ', configDialog);
    // configDialog.appendChild(minChainNumSelect);
    append(minChainNumSelect);

    const maxChainNumSelect = document.createElement('select');
    distributionSelect.setAttribute('id', 'maxChainNum');
    for (let n = 1; n <= maxNum; n++) {
      addOption(`${n}`, `${n}`, maxChainNumSelect);
    }
    addLabel('maxChainNum', '最大必要連鎖数 ', configDialog);
    // configDialog.appendChild(maxChainNumSelect);
    append(maxChainNumSelect);

    minChainNumSelect.addEventListener('change', () => {
      if (Number(minChainNumSelect.value) > Number(maxChainNumSelect.value))
        maxChainNumSelect.value = minChainNumSelect.value;
    })
    maxChainNumSelect.addEventListener('change', () => {
      if (Number(maxChainNumSelect.value) < Number(minChainNumSelect.value))
        minChainNumSelect.value = maxChainNumSelect.value;
    })

    const startButton = document.createElement('button');
    append(startButton);
    startButton.textContent = '始める';
    startButton.addEventListener('click', (e) => {
      const p = puyoAmountSelect.value;
      const d = distributionSelect.value;
      const mi = minChainNumSelect.value;
      const ma = maxChainNumSelect.value;
      // e.preventDefault();
      this._mountain.setGameMode(GameMode.CUSTOM);
      this._mountain.setSelectedValue(p, d, mi, ma);
      this._mountain.initTargetChain();
      stateHandle.setState(GameState.GENE_SEED_PUYOS);
      configDialog.close();

      // close game menu here
      const menu = document.getElementById('menu') as HTMLDialogElement;
      menu.close();
      const title = document.getElementById('title');
      title.style.display = 'none';
    })

    configDialog.appendChild(document.createElement('div'));
    this.addCloseButton(configDialog, '戻る');
  }

  showGameSetting() {
    const settingDialog = document.createElement("dialog");
    document.body.appendChild(settingDialog);
    settingDialog.showModal();

    const makeRadioButton = (radioValue: string, labelText: string, parent: HTMLElement, colors: string[] = null, isChecked = false) => {
      const radioButton = document.createElement("input");
      radioButton.type = "radio";
      radioButton.name = "colorChoice";
      radioButton.value = radioValue;

      const storedOption = this._lSHandle.getColorOption();
      if (storedOption === radioButton.value) {
        radioButton.checked = true;
      }

      const label = document.createElement("label");
      label.appendChild(radioButton);
      label.appendChild(document.createTextNode(labelText));

      parent.appendChild(label);
      parent.appendChild(document.createElement('div'));

      radioButton.addEventListener("click", () => {
        // unused
      });
    }


    const createCircles = (colors: string[], parent: HTMLElement) => {
      const circleContainer = document.createElement("div");

      const createCircle = () => {
        const circle = document.createElement("div");
        circle.classList.add("circle");
        return circle;
      }

      colors.forEach(color => {
        const circle = createCircle();
        circle.style.background = color;
        circleContainer.appendChild(circle);
      });
      parent.appendChild(circleContainer);
    }


    const createInputElement = (attributes: { [key: string]: string }) => {
      const input = document.createElement("input");
      Object.entries(attributes).forEach(([attr, value]) => {
        input.setAttribute(attr, value);
      });
      return input;
    }

    const hexToRgba = (hex, alpha = 1) => {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    // thanks chatgpt
    const rgbaToHex = (rgbaColor: string) => {
      const matches = rgbaColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*(\d+(?:\.\d+)?))?\)/);
      if (!matches) {
        return null;
      }

      const red = parseInt(matches[1]);
      const green = parseInt(matches[2]);
      const blue = parseInt(matches[3]);
      const alpha = matches[4] ? parseFloat(matches[4]) : 1;

      const hexRed = red.toString(16).padStart(2, '0');
      const hexGreen = green.toString(16).padStart(2, '0');
      const hexBlue = blue.toString(16).padStart(2, '0');
      const hexAlpha = alpha === 1 ? '' : Math.round(alpha * 255).toString(16).padStart(2, '0');

      return `#${hexRed}${hexGreen}${hexBlue}${hexAlpha}`;
    }

    const addColorPickers = (parent: HTMLElement) => {
      const colorPickerDatas = [ //id is unnecessary
        { type: "color", value: "#000000", class: "circleColorPicker" },
        { type: "color", value: "#000000", class: "circleColorPicker" },
        { type: "color", value: "#000000", class: "circleColorPicker" },
        { type: "color", value: "#000000", class: "circleColorPicker" }
      ];
      const storedCustomColors = this._lSHandle.getCustomColors();

      const colorPickerContainer = document.createElement('div');
      // colorPickerContainer.setAttribute('id', 'colorPickerContainer'); // ???
      colorPickerDatas.forEach((data, index) => {
        if (storedCustomColors) {
          data.value = rgbaToHex(storedCustomColors[index]);
        }

        const inputElement = createInputElement({
          type: data.type,
          class: data.class,
          value: data.value
        });

        inputElement.addEventListener('change', (e) => {
          // unused
        })

        colorPickerContainer.appendChild(inputElement);
      })

      parent.appendChild(colorPickerContainer);
    }

    const colorss = [
      ["rgba(255, 0, 0, 1)", "rgba(0, 0, 255, 1)", "rgba(0, 200, 0, 1)", "rgba(255, 255, 0, 1)"],
      ["rgba(255, 13, 114, 1)", "rgba(13, 194, 255, 1)", "rgba(13, 255, 114, 1)", "rgba(245, 56, 255, 1)"],
      ["rgba(205, 62, 62, 1)", "rgba(238, 0, 228, 1)", "rgba(0, 228, 0, 1)", "rgba(225, 225, 0, 1)"],
      ["rgba(93, 91, 210, 1)", "rgba(240, 240, 240, 1)", "rgba(236, 174, 39, 1)", "rgba(26, 71, 40, 1)"]
    ];

    const texts = ['セット：おなじみ', 'セット：ベジタブル', 'セット：イタリアン', 'セット：かまくら'];

    colorss.forEach((colors, index) => {
      makeRadioButton(`${index}`, texts[index], settingDialog, colors);
      createCircles(colors, settingDialog);
    })

    makeRadioButton('custom', 'カスタム(クリックで色を変更できます)', settingDialog);
    addColorPickers(settingDialog);

    this.addCloseButton(settingDialog);

    settingDialog.addEventListener("close", (e) => {
      // puyo color change
      // local set

      const selectedOption = document.querySelector('input[name="colorChoice"]:checked') as HTMLInputElement;
      const colorPickers = document.querySelectorAll('input[type="color"]') as NodeListOf<HTMLInputElement>;
      const customColors = [];
      colorPickers.forEach(colorPicker => customColors.push(hexToRgba(colorPicker.value)));
      this._lSHandle.setCustomColors(customColors);
      this._lSHandle.setColorOption(selectedOption.value);

      if (selectedOption.value === "custom") {
        this._lSHandle.setDefaultColors(customColors);
        customColors.forEach((color, index) => {
          PUYO_COLORS[index + 1] = color;
        })
      } else {
        const colorsIndex = Number(selectedOption.value);
        this._lSHandle.setDefaultColors(colorss[colorsIndex]);
        colorss[colorsIndex].forEach((color, index) => {
          PUYO_COLORS[index + 1] = color;
        })
      }

      settingDialog.innerHTML = '';
    });
  }


  private addCloseButton(dialogElement: HTMLDialogElement, text: string = '閉じる') {
    const closeButton = document.createElement("button");
    closeButton.textContent = text;
    closeButton.addEventListener("click", (e) => {
      e.preventDefault();
      dialogElement.close();
    });
    dialogElement.appendChild(closeButton);
  }
}
