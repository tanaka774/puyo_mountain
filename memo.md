## TODO
- [ ] make smooth animation
  - [x] can move down per a few pixel
  - [ ] can move left/right per one cell but animation is smooth 
- [ ] handle arrow key input well
- [ ] rotate properly
  - need to make it animate while rotating(in teto case, not animating because of applying new piece when rotating)
  - in puyo, animating
- [ ] handle mino correctly on top
- [x] ちぎり
- [x] 連鎖判定
- [x] 回した時の押し出し
- [ ] 幽霊（13段目）
- [ ] remove try-catch after debug
- [ ] duration before lockpuyo()
- [ ] attach each connecting puyo
- [ ] chain vanish effect
- [ ] bouncing effect after puyo falling (till three puyos below?)
- [ ] write test code

## doubtful things
- after lockPuyo() sometimes puyo color turns into 0(invisible)
  - temporalily solved by specifying color directly
- error happens at the line using Math.floor(childY) 
  - handle carefully at top or bottom
  - how to set ghost zone (currently at y:-1)
- sometimes submerge puyo below when angle is 0 or 180
- something wrong with `python -m http.server`
- at y:3, something is wrong with drawing, not setting puyo properly

## memo
- createPattern() for background caching
- only redraw changing objects for performance
- implement well splittedpuyo (currently ugly)
  - prepare specific function for spliting and handle splitting process in some loop like while()?
  - for that you should consider about draw() (requestanimationframe or clear() something)
- check all of board for chain (actually want to check only around locked puyos but kinda hard now)
- what about currentpuyo during chainprocessing?
- separate file per each function (defintely!!)
- be careful for round()!!!!
- you don't need to care diagonally down when rotate
### tempmemo
- checkChain() doesn't work right after splitting why
  - this is because handleSplitting() does the same process of lockpuyo() inside 
- checkChain sequencely
- last floatingpuyo vanishes early
- cannot prevent taking input during splitting
- splitting during locking makes weird thing happen
- moving right or left makes puyo submerge adjacent puyo in locking
- draw illustrations of wait-count or somthing later
- lock-wait doesn't work in move right-left and splitting
- sometimes infinite-loop happens with chainprocessing being true and islocked being false
  - what causes this? maybe related to splitting
- should call lockpuyo() in handleSplitting()?
- chain process is still weird
- after splitting nextpuyo becomes weird
- rotating doesn't work correctly, maybe shouldn't move parentpuyo right or left
- sometimes lock-wait doesn't work, maybe when angle is 180
- sometimes key is held down 
