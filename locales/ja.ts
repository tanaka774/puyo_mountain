export const ja = {
  // showRankInModal
  problemOccurred: "問題が発生しました、管理者に問い合わせてください",
  yourTime: "今回のタイム",
  rankIn: (wholeRank: number, seasonRank: number) => `総合${wholeRank}位　シーズン${seasonRank}位にランクインしました`,
  enterUsername: "ユーザーネームを入力してください(10文字以内)",
  send: "送信する",
  sending: "送信中...",
  enterYourName: "名前を入力してください!",
  confirmCaptcha: "スコアを送信する場合はcaptcha認証を行ってください",
  dataSent: "データを送信しました",
  doNotSend: "送信しない",
  confirmNoSend: "今回の記録は残りませんがよろしいですか?",
  notRanked: "今回はランク外でした",

  // showHighScoresModal
  overall: "総合",
  season: "シーズン",
  choose: "選ぶ",
  spring: "1-3",
  summer: "4-6",
  autumn: "7-9",
  winter: "10-12",
  k2: "ケーツー",

  // makeContentFromDB
  name: "名前",
  whole: "総合",
  time: "タイム",
  dateAchieved: "達成日",

  // showArcadeResult
  difficulty: "難易度",
  totalScore: "総合スコア",
  playTime: "プレイ時間",
  unnecessaryPuyos: "不要に消したぷよ数",

  // showCustomConfig
  puyoAmount: "種ぷよの量",
  distribution: "種ぷよの幅",
  minChain: "最小必要連鎖数",
  maxChain: "最大必要連鎖数",
  start: "始める",
  back: "戻る",
  // puyoAmount options
  nothing: "無",
  prettySmall: "かなり少",
  small: "少",
  normal: "標準",
  large: "多",
  prettyLarge: "かなり多",
  random: "ランダム",
  // distribution options
  narrow: "細",
  wide: "広",

  // showGameSetting
  setFamiliar: "セット：おなじみ",
  setVegetable: "セット：ベジタブル",
  setItalian: "セット：イタリアン",
  setKamakura: "セット：かまくら",
  setUnnamed: "セット：むめい",
  customColor: "カスタム(クリックで色を変更できます)",

  // addCloseButton
  close: "閉じる",

  // drawWithCanvas
  useVPuyo: "D: Vぷよ使用",
  changeVPuyoColor: "C: Vぷよ色変更",
  rotate: "Z,X: 回転",
  move: "←↑→↓: 移動",
  pause: "P: ポーズ",
  vPuyo: "Vぷよ",
  chain: "れんさ",
  chainAllClearStr: "ぜんけしすべし",
  chainAllClear: (count: number) => `${count}連鎖全消しすべし`,
  chainLastPhase: (count: number) => `${count}連鎖すべし 最終フェーズ`,
  chainPhase: (count: number, phase: number) => `${count}連鎖すべし フェーズ ${phase}`,
  chainMust: (count: number) => `${count}連鎖すべし`,
  chainCustom: (current: number, total: number) => `${current}連鎖すべし　計 ${total}連鎖`,
  chainEndurance: (current: number, achieved: number, total: number) => `${current}連鎖すべし 　${achieved} / ${total}連鎖`,

  // menu
  arcadeMode: "アーケードモード",
  arcadeModeDesc: "連鎖を組んで頂上を目指そう",
  scoreMode: "スコアモード",
  scoreModeDesc: "最高峰の山を登るまでのタイムを競おう",
  customMode: "カスタムモード",
  customModeDesc: "お好みの種ぷよ量・連鎖数でプレイできます",
  setting: "設定",
  settingDesc: "ゲーム設定を行います",
  easyMountain: "　低山　",
  normalMountain: "　中山　",
  hardMountain: "　高山　",
  difficultyEasy: "難易度:EASY",
  difficultyNormal: "難易度:NORMAL",
  difficultyHard: "難易度:HARD",
  k2Desc: (min: number, max: number, total: number) => `${min}~${max}連鎖で計${total}連鎖まで`,
  watchRecords: "記録を見る",
  watchRecordsDesc: "ハイスコアを閲覧できます",
  backToGame: "ゲームに戻る",
  retry: "リトライする",
  backToMenu: "メニューに戻る",
  climbAgain: "もう一度登る",
};
