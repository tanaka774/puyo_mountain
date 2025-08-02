
import { Menu, MenuSelect } from "../menu";
import { Mountain } from "../mountain/mountain";
import { Difficulty } from "../mountain/mountainArcade";
import { Timer } from "../timer";
import lang from "../../locales";
import { addCloseButton, addTwitterShareButton } from "./utils";

export function showArcadeResult(
  timer: Timer,
  mountain: Mountain,
  menu: Menu
) {
  const [hours, minutes, seconds] = timer.getElapsedTimeDigits();
  mountain.decideGameResult(hours, minutes, seconds);
  const playDuration = `${hours}h ${minutes}m ${seconds}s`
  const difficulty: string = (mountain.checkDifficulty(Difficulty.EASY)) ? 'EASY'
    : (mountain.checkDifficulty(Difficulty.NORMAL)) ? 'NORMAL'
      : (mountain.checkDifficulty(Difficulty.HARD)) ? 'HARD'
        : '';
  const resultDialog = document.createElement("dialog");
  document.body.appendChild(resultDialog);
  resultDialog.showModal();
  resultDialog.addEventListener("close", async (e) => {
    // generate buttons here
    menu.generateButtons(MenuSelect.GAME_CLEAR);
  });

  const resultDifficulty = `${lang.difficulty}:${difficulty}<br><br>`;
  const resultScore = `${lang.totalScore} ${mountain.resultGrade}<br><br>`;
  const resultPlayTime = `${lang.playTime} ${playDuration}<br><br>`
  const resultUnne = `${lang.unnecessaryPuyos} ${mountain.unnecessaryVanishPuyoNum}<br><br>`

  const tempDiv = document.createElement('div');
  tempDiv.style.fontSize = "26px"
  tempDiv.innerHTML = `${resultDifficulty}${resultScore}${resultPlayTime}${resultUnne}`;
  resultDialog.appendChild(tempDiv);

  const shareText = `⛰️${lang.summitReached}⛰️

${lang.puyoMountainArcade}
${lang.difficulty}: ${difficulty}
🏆${lang.totalScore}: ${mountain.resultGrade}
⏰${lang.time}: ${playDuration}

`;
  addTwitterShareButton(resultDialog, shareText);

  addCloseButton(resultDialog);
}
