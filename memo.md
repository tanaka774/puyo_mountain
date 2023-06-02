## TODO
- [ ] make smooth animation
  - [x] can move down per a few pixel
  - [ ] can move left/right per one cell but animation is smooth 
- [ ] handle arrow key input well
- [ ] rotate properly
  - need to make it animate while rotating(in teto case, not animating because of applying new piece when rotating)
  - in puyo, animating
- [ ] handle mino correctly on top
- [ ] ちぎり
- [ ] 連鎖判定
- [ ] 回した時の押し出し
- [ ] 幽霊（13段目）
- [ ] remove try-catch after debug

## doubtful things
- after lockPuyo() sometimes puyo color turns into 0(invisible)
  - temporalily solved by specifying color directly
- error happens at the line using Math.floor(childY) 
  - handle carefully at top or bottom
  - how to set ghost zone (currently at y:-1)
- sometimes submerge puyo below when angle is 0 or 180
- something wrong with `python -m http.server`

## memo
- createPattern() for background caching
- only redraw changing objects for performance
- implement well splittedpuyo (currently ugly)
