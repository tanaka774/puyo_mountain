
import { ApiHandle } from "../apiHandle";
import { gameConfig } from "../config";
import lang from "../../locales";
import { addCloseButton, formatTime, formatCreatedAt } from "./utils";

export async function showHighScoresModal(apiHandle: ApiHandle) {
  const highScoreDialog = document.createElement("dialog");
  document.body.appendChild(highScoreDialog);

  Object.assign(highScoreDialog.style, {
    width: '90vw',
    maxWidth: '800px'
  });

  highScoreDialog.showModal();

  highScoreDialog.addEventListener("close", async (e) => {
    // unused?
    highScoreDialog.innerHTML = '';
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
  addOption(lang.overall, 'whole', wholeSelect);
  addOption(lang.season, 'season', wholeSelect);
  const yearSelect = document.createElement("select");
  addOption(lang.choose, 'default', yearSelect);
  for (let y = startYear; y <= currentYear; y++) {
    addOption(`${y}`, `${y}`, yearSelect);
  }
  const monthSelect = document.createElement("select");
  addOption(lang.choose, 'default', monthSelect);
  addOption(lang.spring, 'spring', monthSelect);
  addOption(lang.summer, 'summer', monthSelect);
  addOption(lang.autumn, 'autumn', monthSelect);
  addOption(lang.winter, 'winter', monthSelect);
  const modeSelect = document.createElement("select");
  // addOption('選ぶ', 'default', modeSelect);
  // TODO: change gamemode according to select
  addOption(lang.k2, gamemode1, modeSelect);
  // addOption('mode2', gamemode2, modeSelect);
  const scoresOutput = document.createElement("output");
  scoresOutput.classList.add('score-container');

  // TODO: try-catch?
  wholeSelect.addEventListener('change', async () => {
    const selectedValue = wholeSelect.value;
    let data;
    if (selectedValue === 'whole') {
      yearSelect.value = 'default';
      monthSelect.value = 'default';
      data = await apiHandle.fetchWholeData(gamemode, bottomRank);
    } else if (selectedValue === 'season') {
      yearSelect.value = currentYear.toString();
      const minMonth = currentMonth - ((currentMonth % 3 + 2) % 3);
      monthSelect.value =
        (minMonth === 1) ? "spring" :
          (minMonth === 4) ? "summer" :
            (minMonth === 7) ? "autumn" :
              (minMonth === 10) ? "winter" : "default";

      data = await apiHandle.fetchSeasonData(currentYear, minMonth, minMonth + 2, gamemode, bottomRank);
    }
    makeContentFromDB(scoresOutput, data);
  })

  yearSelect.addEventListener('change', async () => {
    if (yearSelect.value === 'default' || monthSelect.value === 'default') return;

    const monthRange = monthSelect.options[monthSelect.selectedIndex].textContent;
    const minMonth = monthRange.split("-")[0];
    const maxMonth = monthRange.split("-")[1];
    const data = await apiHandle.fetchSeasonData(yearSelect.value, minMonth, maxMonth, gamemode, bottomRank);
    makeContentFromDB(scoresOutput, data);
  })

  monthSelect.addEventListener('change', async () => {
    if (yearSelect.value === 'default' || monthSelect.value === 'default') return;

    const monthRange = monthSelect.options[monthSelect.selectedIndex].textContent;
    const minMonth = monthRange.split("-")[0];
    const maxMonth = monthRange.split("-")[1];
    const data = await apiHandle.fetchSeasonData(yearSelect.value, minMonth, maxMonth, gamemode, bottomRank);
    makeContentFromDB(scoresOutput, data);
  })

  modeSelect.addEventListener('change', async () => {
    // TODO:
    gamemode = modeSelect.value;
    if (wholeSelect.value === 'season' && (yearSelect.value === 'default' || monthSelect.value === 'default')) return;

    if (wholeSelect.value === 'whole') {
      const data = await apiHandle.fetchWholeData(gamemode, bottomRank);
      makeContentFromDB(scoresOutput, data);
    } else if (wholeSelect.value === 'season') {
      const monthRange = monthSelect.options[monthSelect.selectedIndex].textContent;
      const minMonth = monthRange.split("-")[0];
      const maxMonth = monthRange.split("-")[1];
      const data = await apiHandle.fetchSeasonData(yearSelect.value, minMonth, maxMonth, gamemode, bottomRank);
      makeContentFromDB(scoresOutput, data);
    }
  })

  highScoreDialog.appendChild(wholeSelect);
  highScoreDialog.appendChild(yearSelect);
  highScoreDialog.appendChild(monthSelect);
  highScoreDialog.appendChild(modeSelect);
  highScoreDialog.appendChild(scoresOutput);
  addCloseButton(highScoreDialog);
  const firstDataToShow = await apiHandle.fetchWholeData(gamemode, bottomRank);
  makeContentFromDB(scoresOutput, firstDataToShow);
}

function makeContentFromDB(dynamicContent: HTMLElement, data) {
  dynamicContent.innerHTML = '';

  const scoreTable = document.createElement('table');
  scoreTable.innerHTML = `
    <thead>
      <tr>
        <th style="text-align: center;">${lang.name}</th>
        <th style="text-align: center;">${lang.whole}</th>
        <th style="text-align: center;">${lang.season}</th>
        <th style="text-align: center;">${lang.time}</th>
        <th style="text-align: center;">${lang.dateAchieved}</th>
      </tr>
    </thead>
    <tbody>
      ${data?.scores?.map(entry => `
        <tr>
          <td style="text-align: center;">${entry.username}</td>
          <td style="text-align: center;">${entry.wholerank}</td>
          <td style="text-align: center;">${entry.seasonrank}</td>
          <td style="text-align: center;">${formatTime(entry.playduration)}</td>
          <td style="text-align: center;">${formatCreatedAt(entry.createdat)}</td>
        </tr>
      `).join('')}
    </tbody>
  `;
  scoreTable.style.backgroundColor = 'black';
  scoreTable.style.width = '100%';
  dynamicContent.appendChild(scoreTable);
}
