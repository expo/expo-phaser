import { PixelRatio } from 'react-native';
import { func, images } from '../utils/library';

const scale = PixelRatio.get();

class SettingsConfig {
  constructor() {
    this.explosion = 128; // * scale;
    this.invader = 32; // * scale;
    this.playerSpeed = 600;
  }
}

const Settings = new SettingsConfig();

export default class Playable {
  constructor({ game, context }) {
    this.player = null;
    this.aliens = null;
    this.bullets = null;
    this.bulletTime = 0;
    // this.cursors;
    // this.fireButton;
    this.explosions = null;
    this.starfield = null;
    this.score = 0;
    this.scoreString = '';
    this.scoreText = null;
    this.lives = null;
    this.enemyBullet = null;
    this.firingTimer = 0;
    this.stateText = null;
    this.livingEnemies = [];

    this.game = game;
    this.context = context;
  }

  preload() {
    const { game } = this;
    const { files } = images;

    console.disableYellowBox = true;

    game.load.image('bullet', func.uri(files.bullet));
    game.load.image('enemyBullet', func.uri(files.enemyBullet));
    game.load.spritesheet(
      'invader',
      func.uri(files.invader),
      Settings.invader,
      Settings.invader
    );
    game.load.image('ship', func.uri(files.player));
    game.load.spritesheet(
      'kaboom',
      func.uri(files.explode),
      Settings.explosion,
      Settings.explosion
    );
    game.load.image('starfield', func.uri(files.starfield));
  }

  updateControls({ velocity }) {
    const { player } = this;
    if (player && player.alive) {
      const speed = Math.floor(velocity * Settings.playerSpeed);

      // reset the player, then check for movement keys
      player.body.velocity.setTo(0, 0);
      player.body.velocity.x = speed;
    }
  }

  scaleNode(node) {
    node.width *= scale;
    node.height *= scale;
  }

  onTouchesBegan() {
    this.pressing = true;
  }

  onTouchesEnded() {
    this.pressing = false;
    if (this.player) {
      if (this.player.alive) {
        this.fireBullet();
      } else {
        this.restart();
      }
    }
  }

  create() {
    const { game } = this;
    const { world } = game;
    const { height, width } = world;

    // game.stage.backgroundColor = '#4488AA';
    game.stage.backgroundColor = '#000';
    game.physics.startSystem(Phaser.Physics.ARCADE);

    /**
     *
     *  A TileSprite is a Sprite that has a repeating texture.
     *  The texture can be scrolled and scaled independently of the TileSprite itself.
     *  Textures will automatically wrap and are designed so that you can create game
     *  backdrops using seamless textures as a source.
     *
     * */

    // the scrolling starfield background
    // this.starfield = game.add.tileSprite(0, 0, width, height, 'starfield');
    this.starfield = game.add.sprite(0, 0, 'starfield');
    this.starfield.height = height;
    this.starfield.width = width;

    // our bullet group
    this.bullets = game.add.group();
    this.bullets.enableBody = true;
    this.bullets.physicsBodyType = Phaser.Physics.ARCADE;
    this.bullets.createMultiple(30, 'bullet');
    this.bullets.setAll('anchor.x', 0.5);
    this.bullets.setAll('anchor.y', 1);
    this.bullets.setAll('width', 6 * scale);
    this.bullets.setAll('height', 36 * scale);
    this.bullets.setAll('outOfBoundsKill', true);
    this.bullets.setAll('checkWorldBounds', true);

    // the enemy's bullets
    this.enemyBullets = game.add.group();
    this.enemyBullets.enableBody = true;
    this.enemyBullets.physicsBodyType = Phaser.Physics.ARCADE;
    this.enemyBullets.createMultiple(30, 'enemyBullet');
    this.enemyBullets.setAll('anchor.x', 0.5);
    this.enemyBullets.setAll('anchor.y', 1);
    this.enemyBullets.setAll('width', 9 * scale);
    this.enemyBullets.setAll('height', 9 * scale);
    this.enemyBullets.setAll('outOfBoundsKill', true);
    this.enemyBullets.setAll('checkWorldBounds', true);

    // the hero!
    this.player = game.add.sprite(width * 0.5, height * 0.833333333, 'ship');

    this.player.anchor.setTo(0.5, 0.5);
    this.scaleNode(this.player);
    game.physics.enable(this.player, Phaser.Physics.ARCADE);

    // the baddies!
    this.aliens = game.add.group();
    this.aliens.enableBody = true;
    this.aliens.physicsBodyType = Phaser.Physics.ARCADE;

    this.createAliens();

    // the score
    this.scoreString = 'Score : ';
    // this.scoreText = game.add.text(10, 10, this.scoreString + this.score, { font: '34px Arial', fill: '#fff' });

    // lives
    this.lives = game.add.group();
    // game.add.text(game.world.width - 100, 10, 'Lives : ', { font: '34px Arial', fill: '#fff' });

    // text
    // this.stateText = game.add.text(game.world.centerX,game.world.centerY,' ', { font: '84px Arial', fill: '#fff' });
    // this.stateText.anchor.setTo(0.5, 0.5);
    // this.stateText.visible = false;

    const lives = 3;
    const shipOffset = width * 0.125;
    const initialshipXoffset = width - shipOffset * lives;
    const shipInterval = 30 * scale;
    const shipY = 60 * scale;

    for (let i = 0; i < lives; i += 1) {
      const ship = this.lives.create(
        initialshipXoffset + shipInterval * i,
        shipY,
        'ship'
      );
      this.scaleNode(ship);
      ship.anchor.setTo(0.5, 0.5);
      ship.angle = 90;
      ship.alpha = 0.4;
    }

    // an explosion pool
    this.explosions = game.add.group();

    // this.explosions.scale = scale;
    this.explosions.createMultiple(30, 'kaboom');
    this.explosions.setAll('height', 128 * scale);
    this.explosions.setAll('width', 128 * scale);
    this.explosions.setAll('transparent', true);

    this.explosions.forEach(this.setupInvader, this);

    // and some controls to play the game with
    // this.cursors = game.input.keyboard.createCursorKeys();
    // this.fireButton = game.input.keyboard.addKey(Phaser.Keyboard.SPACEBAR);
  }

  createAliens() {
    const { game } = this;
    const { world } = game;
    const { height, width } = world;

    const alienDelta = width * 0.25;
    const alienAvailableSpace = width - alienDelta;
    const alienWidth = 32 * scale;
    const alienPadding = 12;
    const aliens = Math.floor(
      alienAvailableSpace / (alienPadding + alienWidth)
    );

    const dimensions = {
      rows: 4,
      columns: aliens
    };
    const alienOffset = {
      x: alienAvailableSpace / dimensions.columns
    };

    for (let y = 0; y < dimensions.rows; y += 1) {
      for (let x = 0; x < dimensions.columns; x += 1) {
        const alien = this.aliens.create(
          x * alienOffset.x,
          y * alienOffset.x,
          'invader'
        );
        this.scaleNode(alien);
        alien.anchor.setTo(0.5, 0.5);
        alien.animations.add('fly', [0, 1, 2, 3], 20, true);
        alien.play('fly');
        alien.body.moves = false;
      }
    }

    // const alienOffset = this.game.world.width
    this.aliens.x = alienWidth / 2;
    this.aliens.y = height * 0.0625;

    // all this does is basically start the invaders moving. notice we're
    // moving the Group they belong to, rather than the invaders directly.
    const tween = this.game.add
      .tween(this.aliens)
      .to(
        { x: width - alienAvailableSpace + alienWidth / 2 },
        2000,
        Phaser.Easing.Linear.None,
        true,
        0,
        1000,
        true
      );

    // when the tween loops it calls descend
    tween.onRepeat.add(this.descend, this);
  }

  setupInvader(invader) {
    invader.anchor.x = 0.5;
    invader.anchor.y = 0.5;
    invader.animations.add('kaboom');
  }

  descend() {
    const { game } = this;
    const { world } = game;
    const { height } = world;

    console.log('Loop');
    this.aliens.y += height * 0.0166666667;
  }

  collisionHandler(bullet, alien) {
    // when a bullet hits an alien we kill them both
    bullet.kill();
    alien.kill();

    // increase the score
    this.score += 20;
    // this.scoreText.text = this.scoreString + this.score;

    // and create an explosion :)
    const explosion = this.explosions.getFirstExists(false);
    if (explosion) {
      explosion.reset(alien.body.x, alien.body.y);
      explosion.play('kaboom', 30, false, true);
    }

    if (this.aliens.countLiving() === 0) {
      this.score += 1000;
      // this.scoreText.text = this.scoreString + this.score;

      this.enemyBullets.callAll('kill', this);
      // this.stateText.text = " You Won, \n Click to restart";
      // this.stateText.visible = true;

      // the "click to restart" handler
      this.game.input.onTap.addOnce(this.restart, this);
    }
  }

  enemyHitsPlayer(player, bullet) {
    const { game } = this;
    bullet.kill();

    this.live = this.lives.getFirstAlive();

    if (this.live) {
      this.live.kill();
    }

    // and create an explosion :)
    const explosion = this.explosions.getFirstExists(false);
    if (explosion) {
      explosion.reset(player.body.x, player.body.y);
      explosion.play('kaboom', 30, false, true);
    }
    // when the player dies
    if (this.lives.countLiving() < 1) {
      player.kill();
      this.enemyBullets.callAll('kill');

      // this.stateText.text=" GAME OVER \n Click to restart";
      // this.stateText.visible = true;

      // the "click to restart" handler
      game.input.onTap.addOnce(this.restart, this);
    }
  }

  enemyFires() {
    const { game } = this;

    // grab the first bullet we can from the pool
    this.enemyBullet = this.enemyBullets.getFirstExists(false);
    this.livingEnemies.length = 0;

    this.aliens.forEachAlive(alien => {
      // put every living enemy in an array
      this.livingEnemies.push(alien);
    });

    if (this.enemyBullet && this.livingEnemies.length > 0) {
      const random = game.rnd.integerInRange(0, this.livingEnemies.length - 1);

      // randomly select one of them
      const shooter = this.livingEnemies[random];
      // and fire the bullet from this enemy
      this.enemyBullet.reset(shooter.body.x, shooter.body.y);

      game.physics.arcade.moveToObject(this.enemyBullet, this.player, 120);
      this.firingTimer = game.time.now + 2000;
    }
  }

  fireBullet() {
    const { bullets, game, player } = this;
    let { bulletTime, bullet } = this;
    // to avoid them being allowed to fire too fast we set a time limit
    if (game.time.now > bulletTime) {
      // grab the first bullet we can from the pool
      bullet = bullets.getFirstExists(false);

      if (bullet) {
        // and fire it
        bullet.reset(player.x, player.y + 8 * scale);
        bullet.body.velocity.y = -400 * scale;
        bulletTime = game.time.now + 200 * scale;
      }
    }
  }

  // resetBullet(bullet) {
  resetBullet() {
    // called if the bullet goes out of the screen
    this.bullet.kill();
  }

  restart() {
    const { lives, aliens, createAliens, player } = this;
    // a new level starts

    // resets the life count
    lives.callAll('revive');
    // and brings the aliens back from the dead :)
    aliens.removeAll();
    createAliens();

    // revives the player
    player.revive();

    // hides the text
    // stateText.visible = false;
  }

  cycleNode(node) {
    const { game } = this;
    const { world } = game;
    const { width } = world;

    const half = node.width / 2;

    if (node.x < -half) {
      node.x = width + half;
    } else if (node.x > width + half) {
      node.x = -half;
    }
  }

  update() {
    const {
      starfield,
      player,
      game,
      firingTimer,
      bullets,
      aliens,
      collisionHandler,
      enemyBullets,
      enemyHitsPlayer
    } = this;
    // scroll the background

    if (starfield.tilePosition) {
      starfield.tilePosition.y += 2;
    }

    if (player.alive) {
      // firing?
      if (game.time.now > firingTimer) {
        this.enemyFires();
      }
      this.cycleNode(player);

      if (this.aliens.y >= player.y && this.lives.countLiving() > 0) {
        player.kill();
        this.enemyBullets.callAll('kill');
        // this.stateText.text=" GAME OVER \n Click to restart";
        // this.stateText.visible = true;

        // the "click to restart" handler
        game.input.onTap.addOnce(this.restart, this);
      }

      // run collision
      game.physics.arcade.overlap(
        bullets,
        aliens,
        collisionHandler,
        null,
        this
      );

      game.physics.arcade.overlap(
        enemyBullets,
        player,
        enemyHitsPlayer,
        null,
        this
      );
    }
  }
}
