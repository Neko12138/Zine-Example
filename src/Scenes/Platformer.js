class Platformer extends Phaser.Scene {
    constructor() {
        super("platformerScene");
    }

    init() {
        // variables and settings
        this.ACCELERATION = 400;
        this.DRAG = 500;    // DRAG < ACCELERATION = icy slide
        this.physics.world.gravity.y = 1500;
        this.JUMP_VELOCITY = -600;
        this.PARTICLE_VELOCITY = 50;
        this.SCALE = 2.0;
        this.waterTimer = 0;
    }

    create() {
        // Create a new tilemap game object which uses 18x18 pixel tiles, and is
        // 45 tiles wide and 25 tiles tall.
        this.map = this.add.tilemap("platformer-level-1", 18, 18, 45, 25);

        // Add a tileset to the map
        // First parameter: name we gave the tileset in Tiled
        // Second parameter: key for the tilesheet (from this.load.image in Load.js)
        this.tileset = this.map.addTilesetImage("kenny_tilemap_packed", "tilemap_tiles");

        // Create a layer
        this.groundLayer = this.map.createLayer("Ground-n-Platforms", this.tileset, 0, 0);

        // Make it collidable
        this.groundLayer.setCollisionByProperty({
            collides: true
        });

        // Create coins from Objects layer in tilemap
        this.coins = this.map.createFromObjects("Objects", {
            name: "coin",
            key: "tilemap_sheet",
            frame: 151
        });

        this.physics.world.enable(this.coins, Phaser.Physics.Arcade.STATIC_BODY);

        // Create a Phaser group out of the array this.coins
        // This will be used for collision detection below.
        this.coinGroup = this.add.group(this.coins);

        // Find water tiles
        this.waterTiles = this.groundLayer.filterTiles(tile => {
            return tile.properties.water == true;
        });


        this.waterEmitter = this.add.particles(0, 0, "kenny-particles", {
            frame: "circle_01.png",
            speed: { min: -15, max: 15 } ,
            accelerationY: -100,
            scale: { start: 0, end: 0.015 },
            lifespan: 500,
            quantity: 5,
            emitting: false
        });
        // It's OK to have it start running

        this.time.addEvent({

            callback: () => {
                this.waterTiles.forEach(tile => {
                    this.waterEmitter.emitParticleAt(tile.getCenterX(), tile.getCenterY() + 9); 
                });
                
            },
            delay: 500, 
            callbackScope: this,
            loop: true  
        });
        
        // set up player avatar
        my.sprite.player = this.physics.add.sprite(30, 345, "platformer_characters", "tile_0000.png");
        my.sprite.player.setCollideWorldBounds(true);

        // Enable collision handling
        this.physics.add.collider(my.sprite.player, this.groundLayer);

        //set up particles for get coins
        this.coinEmitter = this.add.particles(0, 0, "kenny-particles", {
            //the image for particles
            frame: "star_02.png",
            //The discrete velocity of a particle will randomly scatter in all directions before a direction is specified.
            speed: { min: -150, max: 150 },
            //Particle size
            scale: { start: 0.1, end: 0 },
            //The duration of the particle after it is emitted.
            lifespan: 1500,
            //The number of particles emitted when triggered
            //!!! It is recommended to keep the amount less than three digits. 
            //and never try to raise the amount to three digits.
            quantity: 3,
            //Whether to emit when creating this particle effect. 
            // Defaults to true, but it is generally recommended to set it to false.
            emitting: false
        });

        // Coin collision handler
        this.physics.add.overlap(my.sprite.player, this.coinGroup, (obj1, obj2) => {
            obj2.destroy(); // remove coin on overlap
            this.coinEmitter.emitParticleAt(obj2.x, obj2.y);
            //We want the corresponding particle effect to be triggered only when the player collects the coin.
            //So it is appropriate to put the emit of the particle effect here
            //Note that the x and y axes are not assigned new coordinates.
            //So when you do not set them, or set them to 0,
            //it will release particles in the center of the map (actually the upper left corner of the screen).
            //But remember that emitParticleAt will only trigger the effect once, 
            //it will not be released repeatedly at the same location.
        });

        // set up Phaser-provided cursor key input
        cursors = this.input.keyboard.createCursorKeys();

        this.rKey = this.input.keyboard.addKey('R');

        // debug key listener (assigned to D key)
        this.input.keyboard.on('keydown-D', () => {
            this.physics.world.drawDebug = this.physics.world.drawDebug ? false : true
            this.physics.world.debugGraphic.clear()
        }, this);
        

        // Simple camera to follow player
        this.cameras.main.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);
        this.cameras.main.startFollow(my.sprite.player, true, 0.25, 0.25); // (target, [,roundPixels][,lerpX][,lerpY])
        this.cameras.main.setDeadzone(50, 50);
        this.cameras.main.setZoom(this.SCALE);

        //Using "my" instead of "this" still works
        my.vfx.walking = this.add.particles(0, 0, "kenny-particles", {
            frame: ['star_01.png', 'star_02.png' ],
            scale: {start: 0.03, end: 0.06},
            lifespan: 150,
            //Particle visibility
            //Here is a fade-out effect over the particle's lifetime
            //The reverse can also be a fade-in
            alpha: {start: 1, end: 0.1}, 
            
        });
        //This method can also be used to make the particle effect not emit directly when it is created
        //But it is more recommended to use "emitting: false"
        my.vfx.walking.stop();
        

    }

    update() {
        if(cursors.left.isDown) {
            my.sprite.player.setAccelerationX(-this.ACCELERATION);
            my.sprite.player.resetFlip();
            my.sprite.player.anims.play('walk', true);

            
            my.vfx.walking.startFollow(my.sprite.player, my.sprite.player.displayWidth/2-10, my.sprite.player.displayHeight/2-1);
            //Here you can set the particle effect to follow a specific target (sprite object).
            //The x and y here will be based on the sprite's coordinate axis
            //That is, if you don't set it, or set it to 0, it will follow the center of the sprite.
            //It should be noted that although startFollow has "start" it cannot start the particle effect.
            if (my.sprite.player.body.blocked.down) {
                //We want that there will be smoke under the feet only when the player's character is blocked, so we have to set an if
                //But even if there is no if, it is completely fine to put it directly into start.
                my.vfx.walking.start();
            }

        } else if(cursors.right.isDown) {
            my.sprite.player.setAccelerationX(this.ACCELERATION);
            my.sprite.player.setFlip(true, false);
            my.sprite.player.anims.play('walk', true);


            my.vfx.walking.startFollow(my.sprite.player, my.sprite.player.displayWidth/2-10, my.sprite.player.displayHeight/2-1);
            
            if (my.sprite.player.body.blocked.down) {

                my.vfx.walking.start();
            }

        } else {
            my.sprite.player.setAccelerationX(0);
            my.sprite.player.setDragX(this.DRAG);
            my.sprite.player.anims.play('idle');

            my.vfx.walking.stop();
        }

        

        if(!my.sprite.player.body.blocked.down) {
            my.sprite.player.anims.play('jump');
        }
        if(my.sprite.player.body.blocked.down && Phaser.Input.Keyboard.JustDown(cursors.up)) {
            my.sprite.player.body.setVelocityY(this.JUMP_VELOCITY);
        }

        if(Phaser.Input.Keyboard.JustDown(this.rKey)) {
            this.scene.restart();
        }
        
    }
}