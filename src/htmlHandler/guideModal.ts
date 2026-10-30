import { gameConfig } from "../config";
import lang from "../../locales";
import { addCloseButton, createControlsList } from "./utils";

export function showGuide() {
  const guideDialog = document.createElement("dialog");
  guideDialog.classList.add("guide");
  document.body.appendChild(guideDialog);
  guideDialog.addEventListener("close", () => guideDialog.remove());
  // arrow keys scroll the body, Enter closes like Escape
  guideDialog.addEventListener("keydown", e => {
    if (e.key === "Enter") {
      e.preventDefault();
      guideDialog.close();
    }
  });

  const heading = document.createElement("h2");
  heading.textContent = lang.guide;
  guideDialog.appendChild(heading);

  // only the body scrolls, so focusing the close button doesn't jump to the bottom
  const body = document.createElement("div");
  body.classList.add("guide-body");
  guideDialog.appendChild(body);

  const addSection = (title: string, items: string[][]) => {
    const section = document.createElement("section");
    const sectionTitle = document.createElement("h3");
    sectionTitle.textContent = title;
    section.appendChild(sectionTitle);
    const list = document.createElement("dl");
    items.forEach(([term, desc]) => {
      const dt = document.createElement("dt");
      dt.textContent = term;
      const dd = document.createElement("dd");
      dd.textContent = desc;
      list.append(dt, dd);
    });
    section.appendChild(list);
    body.appendChild(section);
  }

  addSection(lang.guideFlowTitle, lang.guideFlow);
  addSection(lang.guideModesTitle, [
    [lang.arcadeMode, lang.guideArcade],
    [lang.scoreMode, lang.guideScore(gameConfig.ENDURANCE_MIN_ONCE1, gameConfig.ENDURANCE_MAX_ONCE1, gameConfig.ENDURANCE_TOTAL1)],
    [lang.customMode, lang.guideCustom],
  ]);
  body.appendChild(createControlsList());
  addSection(lang.guideFeaturesTitle, lang.guideFeatures);

  addCloseButton(guideDialog);
  guideDialog.showModal();
}
