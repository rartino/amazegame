// Map parameters
const PLAYER_SPEED = 1000; // pixels per second
let MAP_WIDTH = 40;
let MAP_HEIGHT = 40;
let TILE_SIZE = 15;

// Tile types
const TILE_WALL = 0;
const TILE_FLOOR = 1;
const TILE_STONE = 2;
const TILE_PINK_WALL = 3;
const TILE_COIN = 4;
const TILE_EXIT = 100;

// Global variables
let rooms = []; // Declare rooms as a global variable

// BootScene for the start screen
class BootScene extends Phaser.Scene {
    constructor() {
        super('BootScene');
    }

    preload() {
        // Load background image
        this.load.image('background', 'background.png');
    }

    create() {
        // Display background image
        this.add.image(this.scale.width / 2, this.scale.height / 2, 'background').setDisplaySize(this.scale.width, this.scale.height);

        // Display title
        this.add.text(this.scale.width / 2, this.scale.height / 2 - 50, 'Amazegame', { fontSize: '48px', fill: '#ffffff' }).setOrigin(0.5);

        // Display start message
        this.add.text(this.scale.width / 2, this.scale.height / 2 + 50, 'Tap or Press SPACE to Play', { fontSize: '24px', fill: '#ffffff' }).setOrigin(0.5);

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
        this.mapData = null;
        this.coinPosition = null;
    }

    preload() {
        // Load coin image
        // this.load.image('coin', 'coin.png');
    }

    create(data) {
        // Initialize variables
        this.level = data.level || 1;
        this.lives = data.lives || 3;
        this.map = data.mapData || null;
        this.startPoint = data.startPoint || null;
        this.exitPoint = data.exitPoint || null;
        this.coinPosition = data.coinPosition || null;

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
        //this.levelText = this.add.text(10, 10, 'Level: ' + this.level, { fontSize: '16px', fill: '#ffffff' });
        //this.livesText = this.add.text(10, 30, 'Lives: ' + this.lives, { fontSize: '16px', fill: '#ffffff' });

        // Set up cursor keys and restart key
        this.cursors = this.input.keyboard.createCursorKeys();
        this.restartKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R);

        // Add touch controls
        this.addTouchControls();
    }

    update(time, delta) {
        // Handle restart key
        if (Phaser.Input.Keyboard.JustDown(this.restartKey)) {
            this.handleDeath();
            return;
        }

        if (!this.moving) {
            if (Phaser.Input.Keyboard.JustDown(this.cursors.left) || this.swipeDirection === 'left') {
                this.setPlayerMovement(-1, 0);
            } else if (Phaser.Input.Keyboard.JustDown(this.cursors.right) || this.swipeDirection === 'right') {
                this.setPlayerMovement(1, 0);
            } else if (Phaser.Input.Keyboard.JustDown(this.cursors.up) || this.swipeDirection === 'up') {
                this.setPlayerMovement(0, -1);
            } else if (Phaser.Input.Keyboard.JustDown(this.cursors.down) || this.swipeDirection === 'down') {
                this.setPlayerMovement(0, 1);
            }

            this.swipeDirection = null; // Reset swipe direction after use
        }

        if (this.moving) {
            this.movePlayer(delta);
        }
    }

    setPlayerMovement(dx, dy) {
        this.moveDirection = { dx: dx, dy: dy };
        this.moving = true;

        // Calculate offsets to center the maze
        let offsetX = (this.scale.width - MAP_WIDTH * TILE_SIZE) / 2;
        let offsetY = (this.scale.height - MAP_HEIGHT * TILE_SIZE) / 2;

        // Calculate the target position
        this.player.startX = this.player.x;
        this.player.startY = this.player.y;

        // Determine how far the player can move in the selected direction
        let distance = 0;
        let tileX = this.player.tileX;
        let tileY = this.player.tileY;

        while (true) {
            let nextTileX = tileX + dx;
            let nextTileY = tileY + dy;

            if (nextTileX < 0 || nextTileX >= MAP_WIDTH || nextTileY < 0 || nextTileY >= MAP_HEIGHT) {
                break;
            }

            let tile = this.map[nextTileY][nextTileX];
            if (tile == TILE_WALL || tile == TILE_STONE || tile == TILE_PINK_WALL) {
                break;
            }

            tileX = nextTileX;
            tileY = nextTileY;
            distance += TILE_SIZE;

            if (tile == TILE_EXIT) {
                break;
            }            
        }

        this.player.targetX = tileX * TILE_SIZE + TILE_SIZE / 2 + offsetX;
        this.player.targetY = tileY * TILE_SIZE + TILE_SIZE / 2 + offsetY;

        this.player.tileX = tileX;
        this.player.tileY = tileY;
    }

    movePlayer(delta) {
        // Calculate the distance to move this frame
        let distanceToMove = (PLAYER_SPEED * delta) / 1000; // delta is in ms

        // Calculate the difference between target and current position
        let dx = this.player.targetX - this.player.x;
        let dy = this.player.targetY - this.player.y;
        let distanceToTarget = Math.sqrt(dx * dx + dy * dy);

        if (distanceToMove >= distanceToTarget) {
            // Snap to target position
            this.player.x = this.player.targetX;
            this.player.y = this.player.targetY;
            this.moving = false;

            // Check for interactions at the new position
            this.checkPlayerPosition();
        } else {
            // Move towards the target
            let angle = Math.atan2(dy, dx);
            this.player.x += Math.cos(angle) * distanceToMove;
            this.player.y += Math.sin(angle) * distanceToMove;
        }
    }

    checkPlayerPosition() {
        let tileX = this.player.tileX;
        let tileY = this.player.tileY;
        let tile = this.map[tileY][tileX];

        // Check if collected a coin
        if (tile == TILE_COIN) {
            this.lives++;
            this.livesText.setText('Lives: ' + this.lives);
            this.map[tileY][tileX] = TILE_FLOOR;
            this.coinSprite.destroy();
        }

        // Check if reached exit point
        if (tileX == this.exitPoint.x && tileY == this.exitPoint.y) {
            this.level++;
            this.scene.restart({ level: this.level, lives: this.lives });
            return;
        }

        // Check if hit a pink wall (should not happen here since movement stops before pink walls)
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
                exitPoint: this.exitPoint,
                coinPosition: this.coinPosition
            });
        } else {
            // Reset to level 1 and 3 lives
            this.scene.start('BootScene');
        }
    }

    addPlayer() {
        // Calculate offsets to center the maze
        let offsetX = (this.scale.width - MAP_WIDTH * TILE_SIZE) / 2;
        let offsetY = (this.scale.height - MAP_HEIGHT * TILE_SIZE) / 2;

        this.player = this.add.rectangle(0, 0, TILE_SIZE, TILE_SIZE, 0x00ff00);
        this.player.tileX = this.startPoint.x;
        this.player.tileY = this.startPoint.y;
        this.player.startX = this.player.tileX * TILE_SIZE + TILE_SIZE / 2 + offsetX;
        this.player.startY = this.player.tileY * TILE_SIZE + TILE_SIZE / 2 + offsetY;
        this.player.targetX = this.player.startX;
        this.player.targetY = this.player.startY;
        this.player.setPosition(this.player.startX, this.player.startY);
    }

    generateDungeonWithRetries() {
        let maxAttempts = 100;
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

        // Add pink walls without blocking the solution
        addPinkWalls(this.map, random);

        // Place starting point and exit point
        if (!this.placeStartAndExit(random)) {
            // If placement fails, throw an error to trigger a retry
            throw new Error('Failed to place start and exit points');
        }
        this.map[this.exitPoint.y][this.exitPoint.x] = TILE_EXIT;

        // Place a gold coin occasionally
        if (random.between(1, 5) === 1) {
            this.placeGoldCoin(random);
        }

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

    placeGoldCoin(random) {
        // Find all floor tiles except start and exit points
        let floorTiles = [];
        for (let y = 0; y < MAP_HEIGHT; y++) {
            for (let x = 0; x < MAP_WIDTH; x++) {
                if (this.map[y][x] == TILE_FLOOR && !(x == this.startPoint.x && y == this.startPoint.y) && !(x == this.exitPoint.x && y == this.exitPoint.y)) {
                    floorTiles.push({ x: x, y: y });
                }
            }
        }

        // Shuffle and pick a position
        random.shuffle(floorTiles);
        for (let pos of floorTiles) {
            // Ensure coin is reachable
            if (isReachable(this.map, this.startPoint, pos)) {
                this.map[pos.y][pos.x] = TILE_COIN;
                this.coinPosition = pos;
                break;
            }
        }
    }

    drawMap() {
        // Clear existing graphics
        this.children.removeAll();

        // Calculate offsets to center the maze
        let offsetX = (this.scale.width - MAP_WIDTH * TILE_SIZE) / 2;
        let offsetY = (this.scale.height - MAP_HEIGHT * TILE_SIZE) / 2;

        for (let y = 0; y < MAP_HEIGHT; y++) {
            for (let x = 0; x < MAP_WIDTH; x++) {
                let tileX = x * TILE_SIZE + TILE_SIZE / 2 + offsetX;
                let tileY = y * TILE_SIZE + TILE_SIZE / 2 + offsetY;

                if (this.map[y][x] == TILE_WALL) {
                    this.add.rectangle(tileX, tileY, TILE_SIZE, TILE_SIZE, 0x444444);
                } else if (this.map[y][x] == TILE_FLOOR) {
                    this.add.rectangle(tileX, tileY, TILE_SIZE, TILE_SIZE, 0x999999);
                } else if (this.map[y][x] == TILE_STONE) {
                    this.add.rectangle(tileX, tileY, TILE_SIZE, TILE_SIZE, 0x777777);
                } else if (this.map[y][x] == TILE_PINK_WALL) {
                    this.add.rectangle(tileX, tileY, TILE_SIZE, TILE_SIZE, 0xff69b4);
                } else if (this.map[y][x] == TILE_EXIT) {
                    this.add.rectangle(tileX, tileY, TILE_SIZE, TILE_SIZE, 0xff0000);
                } else if (this.map[y][x] == TILE_COIN) {
                    this.add.rectangle(tileX, tileY, TILE_SIZE, TILE_SIZE, 0x999999);
                    this.coinSprite = this.add.circle(tileX, tileY, TILE_SIZE/2.0, 0xffff00);
                    //this.add.image(tileX, tileY, 'coin').setDisplaySize(TILE_SIZE, TILE_SIZE);
                }
            }
        }

        // Draw exit point
        //let exitX = this.exitPoint.x * TILE_SIZE + TILE_SIZE / 2 + offsetX;
        //let exitY = this.exitPoint.y * TILE_SIZE + TILE_SIZE / 2 + offsetY;
        //this.add.rectangle(exitX, exitY, TILE_SIZE, TILE_SIZE, 0xff0000);
        
        // Level and lives text
        this.levelText = this.add.text(10, 10, 'Level: ' + this.level, { fontSize: '16px', fill: '#ffffff', backgroundColor: '#000000'});
        this.livesText = this.add.text(10, 30, 'Lives: ' + this.lives, { fontSize: '16px', fill: '#ffffff', backgroundColor: '#000000'});

        // Restart button
        this.addRestartButton();
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

    drawButton(x, y, textString, textStyle) {
        // Create the text object
        const text = this.add.text(x, y, textString, textStyle);

        // Add some padding to the rectangle
        const padding = 10;

        // Measure the width and height of the text
        const textWidth = text.width;
        const textHeight = text.height;

        // Set the position of the rectangle to match the text position
        const rectX = text.x - padding;
        const rectY = text.y - padding;
        const rectWidth = textWidth + padding * 2;
        const rectHeight = textHeight + padding * 2;

        // Create the graphics object for the rectangle
        const graphics = this.add.graphics();

        // Draw the rounded rectangle (fill black with white border)
        graphics.fillStyle(0x000000, 1); // Black fill
        graphics.lineStyle(2, 0xffffff, 1); // White border

        // Draw the rounded rectangle
        graphics.fillRoundedRect(rectX, rectY, rectWidth, rectHeight, 10);
        graphics.strokeRoundedRect(rectX, rectY, rectWidth, rectHeight, 10);
				graphics.setInteractive(new Phaser.Geom.Rectangle(rectX, rectY, rectWidth, rectHeight), Phaser.Geom.Rectangle.Contains);

        text.setDepth(1);
        
        return graphics;
    }

    addRestartButton() {
        let restartButton = this.drawButton(this.scale.width - 70, 20, 'Retry', { fontSize: '16px', fill: '#ffffff', backgroundColor: '#000000' })
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
        this.doors = []; // Array to store door positions
    }

    addDoor(x, y) {
        this.doors.push({ x: x, y: y });
    }
}

// BSP node class
class Leaf {
    constructor(x, y, width, height) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.MIN_LEAF_SIZE = 6;
        this.leftChild = null;
        this.rightChild = null;
        this.room = null;
    }

    split(random) {
        if (this.leftChild != null || this.rightChild != null) {
            return false; // Already split
        }

        let splitH = random.between(0, 1) == 0;

        if (this.width > this.height && this.width / this.height >= 1.25) {
            splitH = false;
        } else if (this.height > this.width && this.height / this.width >= 1.25) {
            splitH = true;
        }

        let max = (splitH ? this.height : this.width) - this.MIN_LEAF_SIZE;
        if (max <= this.MIN_LEAF_SIZE) {
            return false; // Too small to split
        }

        let split = random.between(this.MIN_LEAF_SIZE, max);

        if (splitH) {
            this.leftChild = new Leaf(this.x, this.y, this.width, split);
            this.rightChild = new Leaf(this.x, this.y + split, this.width, this.height - split);
        } else {
            this.leftChild = new Leaf(this.x, this.y, split, this.height);
            this.rightChild = new Leaf(this.x + split, this.y, this.width - split, this.height);
        }

        return true;
    }

    createRooms(map, random) {
        if (this.leftChild != null || this.rightChild != null) {
            if (this.leftChild != null) {
                this.leftChild.createRooms(map, random);
            }
            if (this.rightChild != null) {
                this.rightChild.createRooms(map, random);
            }
            if (this.leftChild != null && this.rightChild != null) {
                createCorridor(this.leftChild.getRoom(random), this.rightChild.getRoom(random), map, random);
            }
        } else {
            let roomSizeWidth = random.between(4, this.width - 2);
            let roomSizeHeight = random.between(4, this.height - 2);
            let roomPosX = random.between(this.x + 1, this.x + this.width - roomSizeWidth - 1);
            let roomPosY = random.between(this.y + 1, this.y + this.height - roomSizeHeight - 1);

            this.room = new Room(roomPosX, roomPosY, roomSizeWidth, roomSizeHeight);

            rooms.push(this.room);

            // Dig out the room leaving walls around it
            for (let y = roomPosY + 1; y < roomPosY + roomSizeHeight - 1; y++) {
                for (let x = roomPosX + 1; x < roomPosX + roomSizeWidth - 1; x++) {
                    map[y][x] = TILE_FLOOR;
                }
            }
        }
    }

    getRoom(random) {
        if (this.room != null) {
            return this.room;
        } else {
            let lRoom = null;
            let rRoom = null;
            if (this.leftChild != null) {
                lRoom = this.leftChild.getRoom(random);
            }
            if (this.rightChild != null) {
                rRoom = this.rightChild.getRoom(random);
            }
            if (lRoom == null && rRoom == null) {
                return null;
            } else if (lRoom == null) {
                return rRoom;
            } else if (rRoom == null) {
                return lRoom;
            } else if (random.between(0, 1) == 0) {
                return lRoom;
            } else {
                return rRoom;
            }
        }
    }
}

// Dungeon generation functions
function generateDungeon(map, random) {
    let rootLeaf = new Leaf(0, 0, MAP_WIDTH, MAP_HEIGHT);
    let leafs = [];
    leafs.push(rootLeaf);

    let didSplit = true;
    while (didSplit) {
        didSplit = false;
        for (let i = 0; i < leafs.length; i++) {
            let leaf = leafs[i];
            if (leaf.leftChild == null && leaf.rightChild == null) {
                if (leaf.width > 20 || leaf.height > 20 || random.between(0, 100) > 25) {
                    if (leaf.split(random)) {
                        leafs.push(leaf.leftChild);
                        leafs.push(leaf.rightChild);
                        didSplit = true;
                    }
                }
            }
        }
    }

    rootLeaf.createRooms(map, random);
}

function createCorridor(roomA, roomB, map, random) {
    // Choose door positions at corners
    let doorA = getDoorPosition(roomA, random);
    let doorB = getDoorPosition(roomB, random);

    // Carve doors
    map[doorA.y][doorA.x] = TILE_FLOOR;
    map[doorB.y][doorB.x] = TILE_FLOOR;

    // Record door positions in rooms
    roomA.addDoor(doorA.x, doorA.y);
    roomB.addDoor(doorB.x, doorB.y);

    // Create corridor between doors
    if (random.between(0, 1) == 1) {
        // Horizontal then vertical
        carveHorizontalTunnel(doorA.x, doorB.x, doorA.y, map);
        carveVerticalTunnel(doorA.y, doorB.y, doorB.x, map);
    } else {
        // Vertical then horizontal
        carveVerticalTunnel(doorA.y, doorB.y, doorA.x, map);
        carveHorizontalTunnel(doorA.x, doorB.x, doorB.y, map);
    }

    // Place stones if doors are not in corners
    checkAndPlaceStone(roomA, doorA, map);
    checkAndPlaceStone(roomB, doorB, map);
}

function getDoorPosition(room, random) {
    let doorPositions = [
        { x: room.x + 1, y: room.y }, // Top wall, left corner
        { x: room.x + room.width - 2, y: room.y }, // Top wall, right corner
        { x: room.x + 1, y: room.y + room.height - 1 }, // Bottom wall, left corner
        { x: room.x + room.width - 2, y: room.y + room.height - 1 }, // Bottom wall, right corner
        { x: room.x, y: room.y + 1 }, // Left wall, top corner
        { x: room.x, y: room.y + room.height - 2 }, // Left wall, bottom corner
        { x: room.x + room.width - 1, y: room.y + 1 }, // Right wall, top corner
        { x: room.x + room.width - 1, y: room.y + room.height - 2 } // Right wall, bottom corner
    ];

    // Randomly select a door position
    return random.pick(doorPositions);
}

function checkAndPlaceStone(room, door, map) {
    // Check if the door is in a corner
    let isCorner = false;

    if ((door.x == room.x || door.x == room.x + room.width - 1) && (door.y == room.y || door.y == room.y + room.height - 1)) {
        isCorner = true;
    }

    if (!isCorner) {
        // Place a stone inside the room to one side of the door
        let stoneX = door.x;
        let stoneY = door.y;

        if (door.x == room.x) {
            stoneX += 1;
        } else if (door.x == room.x + room.width - 1) {
            stoneX -= 1;
        } else if (door.y == room.y) {
            stoneY += 1;
        } else if (door.y == room.y + room.height - 1) {
            stoneY -= 1;
        }

        map[stoneY][stoneX] = TILE_STONE;
    }
}

function carveHorizontalTunnel(x1, x2, y, map) {
    let min = Math.min(x1, x2);
    let max = Math.max(x1, x2);
    for (let x = min; x <= max; x++) {
        if (map[y][x] != TILE_FLOOR) map[y][x] = TILE_FLOOR;
    }
}

function carveVerticalTunnel(y1, y2, x, map) {
    let min = Math.min(y1, y2);
    let max = Math.max(y1, y2);
    for (let y = min; y <= max; y++) {
        if (map[y][x] != TILE_FLOOR) map[y][x] = TILE_FLOOR;
    }
}

// Function to add pink walls only next to floor tiles
function addPinkWalls(map, random) {
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
        map[pos.y][pos.x] = TILE_PINK_WALL;
    }
}

// Function to perform BFS considering movement constraints
function findReachablePositions(map, startX, startY) {
    let visited = new Set();
    let queue = [];
    let distances = {};

    function posKey(x, y) {
        return x + ',' + y;
    }

    queue.push({ x: startX, y: startY, distance: 0 });
    visited.add(posKey(startX, startY));
    distances[posKey(startX, startY)] = 0;

    while (queue.length > 0) {
        let current = queue.shift();

        // For each direction
        let directions = [
            { dx: -1, dy: 0 },
            { dx: 1, dy: 0 },
            { dx: 0, dy: -1 },
            { dx: 0, dy: 1 }
        ];

        for (let dir of directions) {
            let x = current.x;
            let y = current.y;
            let steps = 0;
            let tile = null;

            // Move in this direction until hitting an obstacle
            while (true) {
                let newX = x + dir.dx;
                let newY = y + dir.dy;

                if (newX < 0 || newX >= MAP_WIDTH || newY < 0 || newY >= MAP_HEIGHT) {
                    break;
                }
                tile = map[newY][newX];
                if (tile == TILE_WALL || tile == TILE_STONE || tile == TILE_PINK_WALL) {
                    break;
                }

                x = newX;
                y = newY;
                steps++;
            }

            if (tile == TILE_PINK_WALL) {
                break;
            }
            
            // If we have moved at least one step
            if (steps > 0) {
                let key = posKey(x, y);
                if (!visited.has(key)) {
                    visited.add(key);
                    distances[key] = current.distance + 1;
                    queue.push({ x: x, y: y, distance: current.distance + 1 });
                }
            }
        }
    }

    return { visited: visited, distances: distances };
}

// Helper function to check if a position is reachable from the start
function isReachable(map, start, target) {
    let { visited } = findReachablePositions(map, start.x, start.y);
    return visited.has(posKey(target.x, target.y));
}

// Helper function for position key
function posKey(x, y) {
    return x + ',' + y;
}

// Phaser configuration with scaling
const config = {
    type: Phaser.AUTO,
    backgroundColor: '#000000',
    scene: [BootScene, GameScene],
    backgroundColor: 0x444444,
    scale: {
        mode: Phaser.Scale.RESIZE, // Allows the game to resize automatically
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: window.innerWidth,
        height: window.innerHeight,
    },
};


const game = new Phaser.Game(config);

// Adjust MAP_WIDTH, MAP_HEIGHT, and TILE_SIZE based on screen size
const maxTiles = 40; // Maximum number of tiles in either dimension
const tileScale = Math.min(window.innerWidth, window.innerHeight) / maxTiles;
TILE_SIZE = tileScale;
MAP_WIDTH = 40;
MAP_HEIGHT = 40;
