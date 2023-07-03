import { Chain } from "./chain";
import { Mountain } from "./mountain";


export class HtmlHandle {
  private _targetChainNumShow: HTMLElement;
  private _chainNumShow: HTMLElement;
  constructor(
    private _chain: Chain,
    private _mountain: Mountain,
  ) {
    this._targetChainNumShow = document.getElementById("targetChainCount");
    this._chainNumShow = document.getElementById("chainCount");

  }

  htmlUpdate() {
    this._targetChainNumShow.textContent = `${this._mountain.currentTargetChainNum} 連鎖せよ！`
    this._chainNumShow.textContent = `${this._chain.chainCount} 連鎖    最大${this._chain.maxVirtualChainCount}連鎖可能`
  }
}
