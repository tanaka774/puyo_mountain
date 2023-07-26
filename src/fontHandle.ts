// TODO: import binary file for your life!!!
import bestTen from './fonts/BestTen-CRT.woff2'; // cannot use @???
// import { scsho } from '@fonts/scsho.jpeg';
// import { dummy } from '@fonts/test'


export class FontHandle {

  private _fontName: string;
  private _fontUrl: string;
  private _fontFormat: string;
  private _fontFace: FontFace;

  constructor(
  ) {
    this.initFont();
    // this.createFontFaceRule();
  }

  initFont() {
    this._fontName = 'custom';
    this._fontFormat = 'woff2';
    // this._fontUrl = `url(/src/fonts/BestTen-CRT.woff2)`;
    this._fontUrl = `url(${bestTen})`;

    this._fontFace = new FontFace(this._fontName, this._fontUrl);
    // this._fontFace = new FontFace(this._fontName, bestTen);
  }

  createFontFaceRule() {
    const styleElement = document.createElement('style');
    styleElement.innerHTML = `
      @font-face {
        font-family: '${this._fontName}';
        src: ${this._fontUrl} format('${this._fontFormat}');
      }
      
      html {  
        font-family: '${this._fontName}', sans-serif;
        /*font-size: 24px;*/
      }

      /*
      .menu-container {
        font-family: '${this._fontName}', sans-serif;
      }
      */
      
    `;
    document.head.appendChild(styleElement);
  }

  // this implemetation is right???
  setCustomFontOnCSS() {
    const root = document.documentElement;
    root.style.setProperty('--custom-font', `'${this._fontName}'`);
  }

  get fontFace() { return this._fontFace; }
  get fontName() { return this._fontName; }
}