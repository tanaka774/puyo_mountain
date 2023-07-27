export class LSHandle {
  private _selectedColorOptionKey: string;
  private _selectedCustomColorsKey: string;
  private _selectedDefaultColorsKey: string;

  constructor() {
    this._selectedColorOptionKey = "colorOption";
    // this._selectedCustomColorsKeys = ["color1", "color2", "color3", "color4"];
    this._selectedCustomColorsKey = "customColors";
    this._selectedDefaultColorsKey = "defaultColors";
  }

  setColorOption(radioValue: string) {
    try {
      localStorage.setItem(this._selectedColorOptionKey, radioValue);
    } catch (err) {
      console.error("Error saving data to localStorage:", err);
    }
  }

  getColorOption() {
    try {
      return localStorage.getItem(this._selectedColorOptionKey);
    } catch (err) {
      console.error("Error getting data from localStorage:", err);
    }
  }

  setCustomColors(colors: string[]) {
    try {
      const serializedColors = JSON.stringify(colors);
      localStorage.setItem(this._selectedCustomColorsKey, serializedColors);
    } catch (err) {
      console.error("Error saving data to localStorage:", err);
    }
  }

  getCustomColors() {
    try {
      const serializedColors = localStorage.getItem(this._selectedCustomColorsKey);
      if (serializedColors) {
        return JSON.parse(serializedColors);
      } else {
        return undefined;
      }
    } catch (err) {
      console.error("Error getting data from localStorage:", err);
    }
  }

  setDefaultColors(colors: string[]) {
    try {
      const serializedColors = JSON.stringify(colors);
      localStorage.setItem(this._selectedDefaultColorsKey, serializedColors);
    } catch (err) {
      console.error("Error saving data to localStorage:", err);
    }
  }

  getDefaultColors() {
    try {
      const serializedColors = localStorage.getItem(this._selectedDefaultColorsKey);
      if (serializedColors) {
        return JSON.parse(serializedColors);
      } else {
        return undefined;
      }
    } catch (err) {
      console.error("Error getting data from localStorage:", err);
    }
  }
}