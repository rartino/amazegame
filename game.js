// Map parameters
const MAP_WIDTH = 40;
const MAP_HEIGHT = 40;
const TILE_SIZE = 15;

// Tile types
const TILE_WALL = 0;
const TILE_FLOOR = 1;
const TILE_STONE = 2;
const TILE_PINK_WALL = 3;

// Global variables
let rooms = []; // Declare rooms as a global variable

// BootScene for the start screen
class BootScene extends Phaser.Scene {
    constructor() {
        super('BootScene');
    }

    preload() {}

    create() {
        // Display start message
        this.add.text(300, 300, 'Tap or Press SPACE to Play', { fontSize: '24px', fill: '#ffffff' }).setOrigin(0.5);

        // Start the game on spacebar press or tap
        this.input.keyboard.once('keydown-SPACE', () => {
            this.scene.start('GameScene', { level: 1, lives: 3 });
        });

        this.input.once('pointerdown', () => {
            this.scene.start('GameScene', { level: 1, lives: 3 });
        });
    }
}

// Main GameScene
class GameScene extends Phaser.Scene {
    constructor() {
        super('GameScene');

        this.level = 1;
        this.lives = 3;
        this.player = null;
        this.cursors = null;
        this.startPoint = null;
        this.exitPoint = null;
        this.moving = false;
        this.moveDirection = null;
        this.retryCount = 0;
        this.mapData = null;
    }

    preload() {}

    create(data) {
        // Initialize variables
        this.level = data.level || 1;
        this.lives = data.lives || 3;
        this.map = data.mapData || null;
        this.startPoint = data.startPoint || null;
        this.exitPoint = data.exitPoint || null;
        this.retryCount = 0;

        this.moving = false;
        this.moveDirection = null;

        if (!this.map) {
            // Generate dungeon
            this.generateDungeonWithRetries();
        } else {
            // Use existing map data
            this.drawMap();
            this.addPlayer();
        }

        // Add level and lives text
        this.levelText = this.add.text(10, 10, 'Level: ' + this.level, { fontSize: '16px', fill: '#ffffff' });
        this.livesText = this.add.text(10, 30, 'Lives: ' + this.lives, { fontSize: '16px', fill: '#ffffff' });

        // Set up cursor keys and restart key
        this.cursors = this.input.keyboard.createCursorKeys();
        this.restartKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R);

        // Add touch controls
        this.addTouchControls();
    }

    update() {
        // Handle restart key
        if (Phaser.Input.Keyboard.JustDown(this.restartKey)) {
            this.handleDeath();
            return;
        }

        if (!this.moving) {
            if (Phaser.Input.Keyboard.JustDown(this.cursors.left) || this.swipeDirection === 'left') {
                this.moveDirection = { dx: -1, dy: 0 };
                this.moving = true;
            } else if (Phaser.Input.Keyboard.JustDown(this.cursors.right) || this.swipeDirection === 'right') {
                this.moveDirection = { dx: 1, dy: 0 };
                this.moving = true;
            } else if (Phaser.Input.Keyboard.JustDown(this.cursors.up) || this.swipeDirection === 'up') {
                this.moveDirection = { dx: 0, dy: -1 };
                this.moving = true;
            } else if (Phaser.Input.Keyboard.JustDown(this.cursors.down) || this.swipeDirection === 'down') {
                this.moveDirection = { dx: 0, dy: 1 };
                this.moving = true;
            }

            this.swipeDirection = null; // Reset swipe direction after use
        }

        if (this.moving) {
            this.movePlayerContinuous();
        }
    }

    movePlayerContinuous() {
        let newX = this.player.tileX + this.moveDirection.dx;
        let newY = this.player.tileY + this.moveDirection.dy;

        if (newX >= 0 && newX < MAP_WIDTH && newY >= 0 && newY < MAP_HEIGHT) {
            let tile = this.map[newY][newX];
            if (tile == TILE_FLOOR) {
                this.player.tileX = newX;
                this.player.tileY = newY;
                this.player.setPosition(this.player.tileX * TILE_SIZE + TILE_SIZE / 2, this.player.tileY * TILE_SIZE + TILE_SIZE / 2);

                // Check if reached exit point
                if (this.player.tileX == this.exitPoint.x && this.player.tileY == this.exitPoint.y) {
                    this.level++;
                    this.scene.restart({ level: this.level, lives: this.lives });
                    return;
                }
            } else if (tile == TILE_PINK_WALL) {
                // Hit a pink wall, die
                this.moving = false;
                this.handleDeath();
                return;
            } else {
                // Hit an obstacle
                this.moving = false;
            }
        } else {
            // Hit map boundary
            this.moving = false;
        }
    }

    handleDeath() {
        this.lives--;
        if (this.lives > 0) {
            // Restart scene with the same map data
            this.scene.restart({
                level: this.level,
                lives: this.lives,
                mapData: this.map,
                startPoint: this.startPoint,
                exitPoint: this.exitPoint
            });
        } else {
            // Reset to level 1 and 3 lives
            this.scene.start('BootScene');
        }
    }

    addPlayer() {
        this.player = this.add.rectangle(0, 0, TILE_SIZE, TILE_SIZE, 0x00ff00);
        this.player.tileX = this.startPoint.x;
        this.player.tileY = this.startPoint.y;
        this.player.setPosition(this.player.tileX * TILE_SIZE + TILE_SIZE / 2, this.player.tileY * TILE_SIZE + TILE_SIZE / 2);
    }

    generateDungeonWithRetries() {
        let maxAttempts = 10;
        let seed = this.level * 1000;
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            try {
                this.generateDungeon(seed + attempt);
                // If generation is successful, exit the loop
                return;
            } catch (e) {
                // Continue to next attempt
            }
        }
        // If all attempts fail, return to the BootScene
        this.scene.start('BootScene');
    }

    generateDungeon(seed) {
        // Initialize random number generator with seed
        let random = new Phaser.Math.RandomDataGenerator([seed.toString()]);

        this.map = [];
        rooms = []; // Reset rooms array

        // Initialize the map array
        for (let y = 0; y < MAP_HEIGHT; y++) {
            this.map[y] = [];
            for (let x = 0; x < MAP_WIDTH; x++) {
                this.map[y][x] = TILE_WALL;
            }
        }

        // Generate dungeon using BSP
        generateDungeon(this.map, random);

        // Place starting point and exit point
        if (!this.placeStartAndExit(random)) {
            // If placement fails, throw an error to trigger a retry
            throw new Error('Failed to place start and exit points');
        }

        // Add pink walls without blocking the solution
        addPinkWalls(this.map, random, this.startPoint, this.exitPoint);

        // Draw the map
        this.drawMap();

        // Add player
        this.addPlayer();
    }

    placeStartAndExit(random) {
        // Find all floor tiles
        let floorTiles = [];
        for (let y = 0; y < MAP_HEIGHT; y++) {
            for (let x = 0; x < MAP_WIDTH; x++) {
                if (this.map[y][x] == TILE_FLOOR) {
                    floorTiles.push({ x: x, y: y });
                }
            }
        }

        // Randomly select starting point
        random.shuffle(floorTiles);
        this.startPoint = floorTiles[0];

        // Perform BFS to find reachable positions
        let { visited, distances } = findReachablePositions(this.map, this.startPoint.x, this.startPoint.y);

        // Find positions at least 5 steps away
        let maxDistance = 0;
        let furthestPositions = [];

        visited.forEach(key => {
            let [xStr, yStr] = key.split(',');
            let x = parseInt(xStr);
            let y = parseInt(yStr);
            let distance = distances[key];
            if (distance >= 5 && !(x == this.startPoint.x && y == this.startPoint.y)) {
                if (distance > maxDistance) {
                    maxDistance = distance;
                    furthestPositions = [{ x: x, y: y }];
                } else if (distance == maxDistance) {
                    furthestPositions.push({ x: x, y: y });
                }
            }
        });

        if (maxDistance < 5 || furthestPositions.length == 0) {
            // Maze is too easy or no reachable positions
            return false;
        }

        // Randomly select an exit point among the furthest positions
        this.exitPoint = random.pick(furthestPositions);

        return true;
    }

    drawMap() {
        // Clear existing graphics
        this.children.removeAll();

        // Redraw level and lives text
        this.levelText = this.add.text(10, 10, 'Level: ' + this.level, { fontSize: '16px', fill: '#ffffff' });
        this.livesText = this.add.text(10, 30, 'Lives: ' + this.lives, { fontSize: '16px', fill: '#ffffff' });

        // Add restart button
        this.addRestartButton();

        for (let y = 0; y < MAP_HEIGHT; y++) {
            for (let x = 0; x < MAP_WIDTH; x++) {
                if (this.map[y][x] == TILE_WALL) {
                    this.add.rectangle(x * TILE_SIZE + TILE_SIZE / 2, y * TILE_SIZE + TILE_SIZE / 2, TILE_SIZE, TILE_SIZE, 0x444444);
                } else if (this.map[y][x] == TILE_FLOOR) {
                    this.add.rectangle(x * TILE_SIZE + TILE_SIZE / 2, y * TILE_SIZE + TILE_SIZE / 2, TILE_SIZE, TILE_SIZE, 0x999999);
                } else if (this.map[y][x] == TILE_STONE) {
                    this.add.rectangle(x * TILE_SIZE + TILE_SIZE / 2, y * TILE_SIZE + TILE_SIZE / 2, TILE_SIZE, TILE_SIZE, 0x777777);
                } else if (this.map[y][x] == TILE_PINK_WALL) {
                    this.add.rectangle(x * TILE_SIZE + TILE_SIZE / 2, y * TILE_SIZE + TILE_SIZE / 2, TILE_SIZE, TILE_SIZE, 0xff69b4);
                }
            }
        }

        // Draw exit point
        this.add.rectangle(this.exitPoint.x * TILE_SIZE + TILE_SIZE / 2, this.exitPoint.y * TILE_SIZE + TILE_SIZE / 2, TILE_SIZE, TILE_SIZE, 0xff0000);
    }

    addTouchControls() {
        this.swipeDirection = null;
        let swipeCoordX, swipeCoordY, swipeCoordX2, swipeCoordY2, swipeMinDistance = 20;

        this.input.on('pointerdown', function(pointer) {
            swipeCoordX = pointer.downX;
            swipeCoordY = pointer.downY;
        }, this);

        this.input.on('pointerup', function(pointer) {
            swipeCoordX2 = pointer.upX;
            swipeCoordY2 = pointer.upY;

            let deltaX = swipeCoordX2 - swipeCoordX;
            let deltaY = swipeCoordY2 - swipeCoordY;

            if (Math.abs(deltaX) > Math.abs(deltaY)) {
                if (Math.abs(deltaX) > swipeMinDistance) {
                    if (deltaX > 0) {
                        this.swipeDirection = 'right';
                    } else {
                        this.swipeDirection = 'left';
                    }
                }
            } else {
                if (Math.abs(deltaY) > swipeMinDistance) {
                    if (deltaY > 0) {
                        this.swipeDirection = 'down';
                    } else {
                        this.swipeDirection = 'up';
                    }
                }
            }
        }, this);
    }

    addRestartButton() {
        let restartButton = this.add.text(500, 10, 'Restart', { fontSize: '16px', fill: '#ffffff', backgroundColor: '#000000' })
            .setInteractive();

        restartButton.on('pointerdown', () => {
            this.handleDeath();
        });
    }
}

// Remaining classes and functions...

// Room class
class Room {
    constructor(x, y, width, height) {
        this.x = x; // Top-left corner x
        this.y = y; // Top-left corner y
        this.width = width;
        this.height = height;
        this.centerX = Math.floor(this.x + this.width / 2);
        this.centerY = Math.floor(this.y + this.height / 2);
    }
}

// Leaf class and dungeon generation functions remain the same as before, using the random generator passed as parameter.

// Adjusted addPinkWalls function:

function addPinkWalls(map, random, startPoint, exitPoint) {
    let wallTiles = [];
    for (let y = 1; y < MAP_HEIGHT - 1; y++) {
        for (let x = 1; x < MAP_WIDTH - 1; x++) {
            if (map[y][x] == TILE_WALL) {
                // Check if adjacent to floor tile
                let adjacentToFloor = false;
                let neighbors = [
                    { x: x - 1, y: y },
                    { x: x + 1, y: y },
                    { x: x, y: y - 1 },
                    { x: x, y: y + 1 }
                ];
                for (let n of neighbors) {
                    if (map[n.y][n.x] == TILE_FLOOR) {
                        adjacentToFloor = true;
                        break;
                    }
                }
                if (adjacentToFloor) {
                    wallTiles.push({ x: x, y: y });
                }
            }
        }
    }

    let numPinkWalls = Math.floor(wallTiles.length * 0.05); // 5% of eligible wall tiles

    random.shuffle(wallTiles);

    for (let i = 0; i < numPinkWalls; i++) {
        let pos = wallTiles[i];
        // Temporarily set the tile to pink wall
        map[pos.y][pos.x] = TILE_PINK_WALL;

        // Check if the path from start to exit is still valid
        let { visited } = findReachablePositions(map, startPoint.x, startPoint.y);
        let exitKey = posKey(exitPoint.x, exitPoint.y);
        if (!visited.has(exitKey)) {
            // Path is blocked, revert to wall
            map[pos.y][pos.x] = TILE_WALL;
        }
    }
}

// Helper function for position key
function posKey(x, y) {
    return x + ',' + y;
}

// Other functions like findReachablePositions remain the same.

// Phaser configuration
const config = {
    type: Phaser.AUTO,
    width: 600,
    height: 600,
    backgroundColor: '#000000',
    scene: [BootScene, GameScene],
};

const game = new Phaser.Game(config);
