
import { ApiHandle } from "../apiHandle";
import { gameConfig } from "../config";
import { Menu, MenuSelect } from "../menu";
import { Mountain } from "../mountain/mountain";
import { Timer } from "../timer";
import { getTurnstileToken } from "../captchaHandle.js"
import lang from "../../locales";
import { addCloseButton, addRecaptcha, addTwitterShareButton } from "./utils";

export async function showRankInModal(
  timer: Timer,
  apiHandle: ApiHandle,
  mountain: Mountain,
  menu: Menu
) { // (wholeRank, seasonRank, isInHighScore:boolean, playDuration, gamemode) {

  const [hours, minutes, seconds] = timer.getElapsedTimeDigits();
  const totalPlayDurationSeconds = timer.getElapsedTimeInSeconds();
  const currentDate = new Date();
  const year = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;
  const minMonth = currentMonth - ((currentMonth % 3 + 2) % 3);
  const bottomRank = gameConfig.BOTTOM_SCORE_RANK;
  const gamemode = mountain.getEnduraceMode();

  const rankInDialog = document.createElement("dialog");
  document.body.appendChild(rankInDialog);

  Object.assign(rankInDialog.style, {
    position: 'fixed',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    zIndex: '100000',
  });

  // don't use showModal() here. it overlays recaptcha challenge completely
  rankInDialog.show();

  rankInDialog.addEventListener("close", async (e) => {
    // generate buttons here so that both of dialog and menu buttons don't appear at the same time.
    menu.generateButtons(MenuSelect.GAME_CLEAR);
  });

  let seasonRankToEnter: number;
  let wholeRankToEnter: number;
  try {
    seasonRankToEnter = await apiHandle.getNextSeasonRankWithRetry(year, minMonth, minMonth + 2, totalPlayDurationSeconds, gamemode);
    wholeRankToEnter = await apiHandle.getNextWholeRankWithRetry(totalPlayDurationSeconds, gamemode);
  } catch (err) {
    console.error(err);
    rankInDialog.innerHTML = '';
    rankInDialog.innerHTML = `${lang.problemOccurred} <br>${lang.yourTime}${hours}h${minutes}m${seconds}s`;
    addCloseButton(rankInDialog);
    return;
  }

  if (seasonRankToEnter <= bottomRank) {
    const whatRankDiv = document.createElement("div");
    whatRankDiv.innerHTML =
      `${lang.yourTime} ${hours}h${minutes}m${seconds}s <br>\n    ${lang.rankIn(wholeRankToEnter, seasonRankToEnter)} <br>`;
    rankInDialog.appendChild(whatRankDiv);

    const inputLabel = document.createElement("label");
    inputLabel.setAttribute("for", "userInput");
    inputLabel.innerHTML = `${lang.enterUsername}<br>`;
    rankInDialog.appendChild(inputLabel);

    const tempDiv = document.createElement("div");
    const userInput = document.createElement("input");
    userInput.setAttribute("type", "text");
    userInput.setAttribute("id", "userInput");
    userInput.setAttribute("maxlength", "10");
    userInput.required = true; // this time "submit" isn't used so this is unnecessary
    tempDiv.appendChild(userInput);
    rankInDialog.appendChild(tempDiv);

    addRecaptcha(rankInDialog);

    const sendButton = document.createElement("button");
    sendButton.textContent = lang.send;
    sendButton.setAttribute("id", "sendButton")
    sendButton.addEventListener("click", (e) => { // async
      e.preventDefault(); // We don't want to submit this fake form
      sendButton.disabled = true;

      const userInput = document.getElementById("userInput") as HTMLInputElement;
      const userName = userInput.value;

      // TODO: sometimes input becomes null even though some words are entered,
      if (!userName || (userName === '')) {
        alert(lang.enterYourName);
        sendButton.disabled = false;
        return;
      }

      const captchaResponse = getTurnstileToken();
      if (!captchaResponse) {
        alert(lang.confirmCaptcha);
        sendButton.disabled = false;
        return;
      }

      apiHandle.addDataWithRetry(userName, totalPlayDurationSeconds, gamemode, captchaResponse)
        .then(() => {
          rankInDialog.innerHTML = '';
          rankInDialog.innerText = lang.dataSent;
          addCloseButton(rankInDialog);

          // update after inserting data, welcome to callback hell
          apiHandle.updateWholeRank(gamemode)
            .then(() => {
              apiHandle.updateSeasonRank(year, minMonth, minMonth + 2, gamemode)
                .catch((err) => { console.error(err); })
            })
            .catch((err) => { console.error(err); })
        })
        .catch((error) => {
          // TODO: when captcha is false
          console.error(error);
          rankInDialog.innerHTML = '';
          rankInDialog.innerHTML = `${lang.problemOccurred} <br>${lang.yourTime}${hours}h${minutes}m${seconds}s`;
          addCloseButton(rankInDialog);
        })
        .finally(() => {
          sendButton.disabled = false
        })
    });

    rankInDialog.appendChild(sendButton);

    const notSendButton = document.createElement("button");
    notSendButton.textContent = lang.doNotSend;
    notSendButton.addEventListener("click", (e) => {
      e.preventDefault();
      const result = confirm(lang.confirmNoSend);
      if (result) {
        // User clicked "OK"
        rankInDialog.close();
      } else {
        // User clicked "Cancel"
      }
    });
    rankInDialog.appendChild(notSendButton);

    const shareText = `⛰️${lang.summitReached}⛰️\n\n${lang.puyoMountainScore}\n⏰${lang.time}: ${hours}h${minutes}m${seconds}s\n🏅${lang.rank}: ${lang.rankIn(wholeRankToEnter, seasonRankToEnter)}\n`;
    addTwitterShareButton(rankInDialog, shareText);

  } else {
    rankInDialog.innerHTML =
      `${lang.yourTime}${hours}h${minutes}m${seconds}s <br>\n    ${lang.notRanked}<br>`

    const shareText = `⛰️${lang.summitReached}⛰️\n\n${lang.puyoMountainScore}\n⏰${lang.time}: ${hours}h${minutes}m${seconds}s\n`;
    addTwitterShareButton(rankInDialog, shareText);

    addCloseButton(rankInDialog);
  }

}
