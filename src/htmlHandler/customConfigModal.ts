
import { GameState, stateHandle } from "../state";
import { GameMode, Mountain } from "../mountain/mountain";
import lang from "../../locales";
import { addCloseButton } from "./utils";

export function showCustomConfig(mountain: Mountain) {
  const configDialog = document.createElement("dialog");
  document.body.appendChild(configDialog);
  configDialog.showModal();
  configDialog.addEventListener("close", async (e) => {
    // unused?
    configDialog.innerHTML = '';
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
  addOption(lang.nothing, 'nothing', puyoAmountSelect);
  addOption(lang.prettySmall, 'pretty-small', puyoAmountSelect);
  addOption(lang.small, 'small', puyoAmountSelect);
  addOption(lang.normal, 'normal', puyoAmountSelect, true);
  addOption(lang.large, 'large', puyoAmountSelect);
  addOption(lang.prettyLarge, 'pretty-large', puyoAmountSelect);
  addOption(lang.random, 'random', puyoAmountSelect);
  addLabel('puyoAmount', `${lang.puyoAmount} `, configDialog);
  // configDialog.appendChild(puyoAmountSelect);
  append(puyoAmountSelect);

  const distributionSelect = document.createElement('select');
  distributionSelect.setAttribute('id', 'distribution');
  addOption(lang.narrow, 'narrow', distributionSelect);
  addOption(lang.normal, 'normal', distributionSelect, true);
  addOption(lang.wide, 'wide', distributionSelect);
  addLabel('distribution', `${lang.distribution} `, configDialog);
  // configDialog.appendChild(distributionSelect);
  append(distributionSelect);

  const maxNum = 20;
  const minChainNumSelect = document.createElement('select');
  distributionSelect.setAttribute('id', 'minChainNum');
  for (let n = 1; n <= maxNum; n++) {
    addOption(`${n}`, `${n}`, minChainNumSelect);
  }
  addLabel('minChainNum', `${lang.minChain} `, configDialog);
  // configDialog.appendChild(minChainNumSelect);
  append(minChainNumSelect);

  const maxChainNumSelect = document.createElement('select');
  distributionSelect.setAttribute('id', 'maxChainNum');
  for (let n = 1; n <= maxNum; n++) {
    addOption(`${n}`, `${n}`, maxChainNumSelect);
  }
  addLabel('maxChainNum', `${lang.maxChain} `, configDialog);
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
  startButton.textContent = lang.start;
  startButton.addEventListener('click', (e) => {
    const p = puyoAmountSelect.value;
    const d = distributionSelect.value;
    const mi = minChainNumSelect.value;
    const ma = maxChainNumSelect.value;
    // e.preventDefault();
    mountain.setGameMode(GameMode.CUSTOM);
    mountain.setSelectedValue(p, d, mi, ma);
    mountain.initTargetChain();
    stateHandle.setState(GameState.GENE_SEED_PUYOS);
    configDialog.close();

    // close game menu here
    const menu = document.getElementById('menu') as HTMLDialogElement;
    menu.close();
    const title = document.getElementById('title');
    title.style.display = 'none';
  })

  configDialog.appendChild(document.createElement('div'));
  addCloseButton(configDialog, lang.back);
}
