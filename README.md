## puyo mountain
What's here is the source code of [puyo mountain](https://puyo-mountain.vercel.app/)  
Japanese game explanation is [here](https://puyo-camp.jp/posts/172682) (this is explained with some pics so more understandable.)  

## What is this game?
This is the copy game of puyopuyo and I'm adding my own game mode.  
Currently I'm developing a single player mode only.

## What are the differences from typical puyo?
The following are the features of this game.
- Basic game flow. First, random seed puyos fall on your board. And you are supposed to make a chain whose number is specified at each level, and can move next level by igniting that.
  - for example, when 6 chain number is needed, you make and ignite a chain more than 6 and can move next level(and get another seed puyos and a chain number specified).
- You'll see maximum chain number you can ignite currently on the side of board.
- You can use "Vpuyo (versatile puyo)" just once at each level, which is two puyos of same color. You can fetch Vpuyo and change the color of Vpuyo into any.

## Tech-stack
### Language
This project is written mostly in typescript. You can build locally with `npx vite`.
### Game engine
This project doesn't use any game-engine and is written from scratch. Canvas is used for game graphic and DOM for UI.
### Deployment
This project is deployed with vercel environment. But maybe this environment would change because of maintainablity and sustainablity. Actually this vercel environment doesn't have any problems and free-tier usage is enough about static contents. But I want to host myself as possible as I can in the future.
### Database
This project uses database for high score system. Currently I manage that with vercel postgres with serverless function. That is still in beta but just works. But it seems to me free-tier usage of this postgres is limited significantly. And adding to that for the same reason as above, I'm considering migrating into other environment.  

## Miscellneous things
- font: this game is using the font of [bestten](https://booth.pm/ja/items/2747965)
