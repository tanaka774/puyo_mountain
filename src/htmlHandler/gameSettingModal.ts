import { LSHandle } from "../localStorageHandle";
import { PUYO_COLORS } from "../config";
import lang from "../../locales";
import { addCloseButton } from "./utils";

export function showGameSetting(lSHandle: LSHandle) {
  const settingDialog = document.createElement("dialog");
  document.body.appendChild(settingDialog);
  settingDialog.showModal();

  const makeRadioButton = (radioValue: string, labelText: string, parent: HTMLElement, colors: string[] = null, isChecked = false) => {
    const radioButton = document.createElement("input");
    radioButton.type = "radio";
    radioButton.name = "colorChoice";
    radioButton.value = radioValue;

    const storedOption = lSHandle.getColorOption();
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
    const storedCustomColors = lSHandle.getCustomColors();

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
    ["rgba(93, 91, 210, 1)", "rgba(240, 240, 240, 1)", "rgba(236, 174, 39, 1)", "rgba(26, 71, 40, 1)"],
    ["rgba(55, 185, 87, 1)", "rgba(145, 111, 64, 1)", "rgba(245, 245, 245, 1)", "rgba(223, 32, 115, 1)"],
  ];

  const texts = [lang.setFamiliar, lang.setVegetable, lang.setItalian, lang.setKamakura, lang.setUnnamed];

  colorss.forEach((colors, index) => {
    makeRadioButton(`${index}`, texts[index], settingDialog, colors);
    createCircles(colors, settingDialog);
  })

  makeRadioButton('custom', lang.customColor, settingDialog);
  addColorPickers(settingDialog);

  // temp
  // this.addRecaptcha(settingDialog);

  addCloseButton(settingDialog);

  settingDialog.addEventListener("close", (e) => {
    // puyo color change
    // local set

    const selectedOption = document.querySelector('input[name="colorChoice"]:checked') as HTMLInputElement;
    const colorPickers = document.querySelectorAll('input[type="color"]') as NodeListOf<HTMLInputElement>;
    const customColors = [];
    colorPickers.forEach(colorPicker => customColors.push(hexToRgba(colorPicker.value)));
    lSHandle.setCustomColors(customColors);
    lSHandle.setColorOption(selectedOption.value);

    if (selectedOption.value === "custom") {
      lSHandle.setDefaultColors(customColors);
      customColors.forEach((color, index) => {
        PUYO_COLORS[index + 1] = color;
      })
    } else {
      const colorsIndex = Number(selectedOption.value);
      lSHandle.setDefaultColors(colorss[colorsIndex]);
      colorss[colorsIndex].forEach((color, index) => {
        PUYO_COLORS[index + 1] = color;
      })
    }

    settingDialog.innerHTML = '';
  });
}