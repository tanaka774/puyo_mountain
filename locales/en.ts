export const en = {
  // showRankInModal
  problemOccurred: "A problem has occurred, please contact the administrator",
  yourTime: "Your time",
  rankIn: (wholeRank: number, seasonRank: number) => `You have ranked ${wholeRank} in the whole and ${seasonRank} in the season.`,
  enterUsername: "Please enter your username (up to 10 characters)",
  send: "Send",
  sending: "Sending...",
  enterYourName: "Please enter your name!",
  confirmCaptcha: "Please confirm the captcha to send your score",
  dataSent: "Data sent",
  doNotSend: "Don't Send",
  confirmNoSend: "Your record will not be saved, are you sure?",
  notRanked: "You were not ranked this time",

  // showHighScoresModal
  overall: "Whole",
  season: "Season",
  choose: "Choose",
  spring: "1-3",
  summer: "4-6",
  autumn: "7-9",
  winter: "10-12",
  k2: "K2",

  // makeContentFromDB
  name: "Name",
  whole: "Whole",
  time: "Time",
  dateAchieved: "Date Achieved",

  // showArcadeResult
  difficulty: "Difficulty",
  totalScore: "Total Score",
  playTime: "Play Time",
  unnecessaryPuyos: "Number of unnecessarily erased puyos",

  // showCustomConfig
  puyoAmount: "Amount of seed puyos",
  distribution: "Width of seed puyos",
  minChain: "Minimum required chain",
  maxChain: "Maximum required chain",
  start: "Start",
  back: "Back",
  // puyoAmount options
  nothing: "Nothing",
  prettySmall: "Pretty Small",
  small: "Small",
  normal: "Normal",
  large: "Large",
  prettyLarge: "Pretty Large",
  random: "Random",
  // distribution options
  narrow: "Narrow",
  wide: "Wide",

  // showGameSetting
  setFamiliar: "Set: Familiar",
  setVegetable: "Set: Vegetable",
  setItalian: "Set: Italian",
  setKamakura: "Set: Kamakura",
  setUnnamed: "Set: Mumei",
  customColor: "Custom (click to change color)",

  // addCloseButton
  close: "Close",

  // drawWithCanvas
  useVPuyo: "D: Use V Puyo",
  changeVPuyoColor: "C: Change V Puyo Color",
  rotate: "Z,X: Rotate",
  move: "←↑→↓: Move",
  pause: "P: Pause",
  vPuyo: "V Puyo",
  chain: "Chain",
  chainAllClearStr: "and All Clear!",
  chainAllClear: (count: number) => `${count} Chain and All Clear!`,
  chainLastPhase: (count: number) => `${count} Chain  Last Phase!`,
  chainPhase: (count: number, phase: number) => `${count} Chain  Phase ${phase}!`,
  chainMust: (count: number) => `Make a ${count}-Chain!`,
  chainCustom: (current: number, total: number) => `${current} Chain! Total ${total}`,
  chainEndurance: (current: number, achieved: number, total: number) => `${current} Chain! ${achieved} / ${total} Total`,
};
