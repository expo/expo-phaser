[![NPM](https://nodei.co/npm/expo-phaser.png)](https://nodei.co/npm/expo-phaser/)

# expo-phaser

Tools for using Phaser-ce to build native 2D games in Expo 👾

- [Installation](#installation)
- [Usage](#usage)
- [Functions](#functions)
- [Example](#example)
- [Demo](#demo)

### Installation

```bash
yarn add expo-phaser
```

### Usage

Import the library into your JavaScript file:

```js
import ExpoPhaser from "expo-phaser";
```

## Functions

### `ExpoPhaser.game({ context: WebGLRenderingContext, ...extras })`

Given a `context` from an
[`Expo.GLView`](https://docs.expo.io/versions/latest/sdk/gl-view.html), return a
[`Phaser.Game`](https://phaser.io/docs/2.6.2/Phaser.Game.html)
that draws into it.

#### Props

| Property    |         Type          | Description                                                                 |         Default Value         |
| ----------- | :-------------------: | --------------------------------------------------------------------------- | :---------------------------: |
| context     | WebGLRenderingContext | Required: context that the `Phaser.Game` will render to                     |            `null`             |
| width       |        number?        | Optional: height of the `Phaser.Game`                                       | `context.drawingBufferWidth`  |
| height      |        number?        | Optional: width of the `Phaser.Game`                                        | `context.drawingBufferHeight` |
| title       |        string?        | Optional: title of the `Phaser.Game`                                        |     `"expo-phaser-game"`      |
| preventLoop |       boolean?        | Optional: Prevents the app from calling `context.endFrameEXP()` every frame |            `false`            |

#### Returns

| Property |                              Type                              | Description                                      |
| -------- | :------------------------------------------------------------: | ------------------------------------------------ |
| game     | [`Phaser.Game`](https://phaser.io/docs/2.6.2/Phaser.Game.html) | The Phaser-ce game used for rendering game logic |

## Example

```js
const game = ExpoPhaser.game({ context });
```

## What does it do?

Under the hood, ExpoPhaser is maintaining global instances of a few libraries.

- [Custom Phaser Pixi.js](https://github.com/photonstorm/phaser-ce/tree/master/src/pixi)
- [Custom Phaser p2.js](https://github.com/photonstorm/phaser-ce/blob/master/build/custom/p2.js)
- [Phaser-ce (Community Edition)](https://github.com/photonstorm/phaser-ce)

```js
window.PIXI = require("phaser-ce/build/custom/pixi");
window.p2 = require("phaser-ce/build/custom/p2");
window.Phaser = require("phaser-ce/build/phaser");
```

Other libs can be included but are not required. For instance you can import the custom Creature lib the same way.
We also [override the `PIXI.WebGLRenderer.updateTexture`](https://github.com/expo/expo-phaser/tree/master/lib/Phaser.js) to make it compatible with Expo.

Finally when a new instance of `Expo.Game` is created, we set the `document.readyState` to `'complete'` and save the global instance of `context`

```js
global.__context = context;
global.document.readyState = "complete";
```

Then we create a standard render loop and call `context.endFrameEXP()` to flush the frame queue and render our context through `EXGL`.

```js
const render = () => {
  requestAnimationFrame(render);
  context.endFrameEXP();
};
```

## Example

It's important to note that you must preload all of your assets before starting the app, as the `Phaser.State.preload` method cannot be asynchronous.
Creating a game in Expo is very simple with `ExpoPhaser`, we preload our assets, create a view, initialize our game, then add our assets.

**We create an `Expo.GLView` to render our game to.**

```jsx
return (
  <Expo.GLView
    style={{ flex: 1 }}
    onContextCreate={context => startGame({ context })}
  />
);
```

**Then we create our `Phaser.Game` instance and assign it a playable state. We can then choose to start said state.**

```js
function startGame({ context }) {
  const game = ExpoPhaser.game({ context });

  game.state.add("Playable", {
    preload: function() {
      /// This function cannot be async, preload all assets before getting here.
      game.load.image(
        "man",
        Expo.Asset.fromModule(Assets["man.json"]).localUri
      );
    },
    create: function() {},
    update: function() {}
  });

  game.state.start("Playable");
}
```

**Preloading**

In React Native all assets must be static resources, because of this we must create a reference to all the assets we may use, then download them and get their local URI.
Expo has a convenient way of saving reference. We preload an `Expo.Asset` then if we create the same instance later we can simple call `asset.localUri`.

In a standard Phaser app we would load an asset like this:

```js
game.load.image("man", "./assets/man.png");
```

In expo we would load it like this:

```js
const preloadedExpoAsset = Expo.Asset.fromModule(require('./assets/man.png'))
await preloadedExpoAsset.downloadAsync();

...

game.load.image('man', preloadedExpoAsset.localUri);
```

### All together

This example shows how to load an animated texture atlas and apply arcade physics to it.

```js
import React from "react";
import Expo from "expo";
import ExpoPhaser from "expo-phaser";

const Assets = {
  "man.png": require("./assets/man.png"),
  "man.json": require("./assets/man.json")
};

export default class App extends React.Component {
  state = { loading: true };
  async componentWillMount() {
    const downloads = [];
    for (let key of Object.keys(Assets)) {
      const asset = Expo.Asset.fromModule(Assets[key]);
      downloads.push(asset.downloadAsync());
    }
    await Promise.all(downloads);
    this.setState({ loading: false });
  }
  render() {
    if (this.state.loading) {
      return <Expo.AppLoading />;
    }

    return (
      <Expo.GLView
        style={{ flex: 1 }}
        onContextCreate={context => startGame({ context })}
      />
    );
  }
}

function startGame({ context }) {
  const game = ExpoPhaser.game({ context });

  game.state.add("Playable", {
    preload: function() {
      const atlas = Expo.Asset.fromModule(Assets["man.json"]).localUri;
      const texture = Expo.Asset.fromModule(Assets["man.png"]).localUri;
      game.load.atlasJSONHash("man", texture, atlas);
    },
    create: function() {
      game.stage.backgroundColor = "#4488AA";

      game.physics.startSystem(Phaser.Physics.ARCADE);

      //  Set the world (global) gravity
      game.physics.arcade.gravity.y = 100;

      const man = game.add.sprite(200, 200, "man");
      game.physics.enable([man], Phaser.Physics.ARCADE);

      //  Here we add a new animation called 'run'
      //  We haven't specified any frames because it's using every frame in the texture atlas

      man.animations.add("run");
      man.body.collideWorldBounds = true;
      man.body.bounce.y = 0.8;
      man.body.gravity.y = 200;

      //  And this starts the animation playing by using its key ("run")
      //  15 is the frame rate (15fps)
      //  true means it will loop when it finishes
      man.animations.play("run", 15, true);
    },
    update: function() {}
  });

  game.state.start("Playable");
}
```

**note:** When working with `.json` asset inclusion, be sure to update the app.json file to handle `.json` appropriately.

```
"packagerOpts": {
  "assetExts": [
    "json"
  ]
},
```

## Demo

Within this repo is an [examples/basic](examples/basic) demo.

<p align="left">
  <img src="screenshots/screenshot1.png?raw=true" width="440" />
  <img src="screenshots/screenshot2.png?raw=true" width="440" />
</p>
