/*
 * File: genGrid.js
 * Author: Sam Armstrong
 * Course: COSC4103 - Computer Graphics
 * Assignment: Putting it all Together
 * Due Date: December 3, 2025
 * 
 * A function to generate a usable grid JSON
 */

const fs = require('node:fs');

var xSize = 3;
var ySize = 3;
var zSize = 3;

var grid = [];

function calcIndex(x, y, z) {
    return x + y * xSize + z * xSize * zSize
}

function within(value, space) {
    if (value >= space) {
        return value % space;
    }
    if (value < 0) {
        return (value % space) + space;
    }
    return value;
}


for (var k = 0; k < zSize; k++) {
    for (var j = 0; j < ySize; j++) {
        for (var i = 0; i < xSize; i++) {
            //if (i == 1 && j == 1 && k == 1) {continue}
            let currentIndex = calcIndex(i, j, k);

            let nextX = calcIndex(within(i+1, xSize), j, k);
            let nextY = calcIndex(i, within(j+1, ySize), k);
            let nextZ = calcIndex(i, j, within(k+1, zSize));

            let distX = 1.0;
            let distY = 1.0;
            let distZ = 1.0;

            let lastX = calcIndex(within(i-1, xSize), j, k);
            let lastY = calcIndex(i, within(j-1, ySize), k);
            let lastZ = calcIndex(i, j, within(k-1, zSize));
            
            let posXWall = false;
            let posYWall = false;
            let posZWall = false;
            let negXWall = false;
            let negYWall = false;
            let negZWall = false;

            let wallInt = 0;

            if ((i+1 >= xSize) && (j+1 >= ySize || k+1 >= zSize || j-1 < 0 || k-1 < 0)) { posXWall = true }
            if ((j+1 >= ySize) && (i+1 >= xSize || k+1 >= zSize || i-1 < 0 || k-1 < 0)) { posYWall = true }
            if ((k+1 >= zSize) && (i+1 >= xSize || j+1 >= ySize || j-1 < 0 || i-1 < 0)) { posZWall = true }
            if ((i-1 < 0) && (k+1 >= zSize || j+1 >= ySize || j-1 < 0 || k-1 < 0)) { negXWall = true }
            if ((j-1 < 0) && (k+1 >= zSize || i+1 >= xSize || i-1 < 0 || k-1 < 0)) { negYWall = true }
            if ((k-1 < 0) && (j+1 >= ySize || i+1 >= xSize || i-1 < 0 || j-1 < 0)) { negZWall = true }
            
            if (posXWall) { wallInt |= 32 }
            if (negXWall) { wallInt |= 16 }
            if (posYWall) { wallInt |= 8 }
            if (negYWall) { wallInt |= 4 }
            if (posZWall) { wallInt |= 2 }
            if (negZWall) { wallInt |= 1 }

            let node = {
                nextIndices: [nextX, nextY, nextZ],
                nextDistances: [distX, distY, distZ],
                lastIndices: [lastX, lastY, lastZ],
                wallInt: wallInt
            }

            grid.push(node);
        }
    }
}

grid[calcIndex(1, 1, 0)].nextIndices[2] = calcIndex(1, 1, 2);
grid[calcIndex(1, 0, 1)].nextIndices[1] = calcIndex(1, 2, 1);
grid[calcIndex(0, 1, 1)].nextIndices[0] = calcIndex(2, 1, 1);
grid[calcIndex(1, 1, 2)].lastIndices[2] = calcIndex(1, 1, 0);
grid[calcIndex(1, 2, 1)].lastIndices[1] = calcIndex(1, 0, 1);
grid[calcIndex(2, 1, 1)].lastIndices[0] = calcIndex(0, 1, 1);


try {
    fs.writeFileSync(`basicGrid-${String(xSize)}-${String(ySize)}-${String(zSize)}_gap.json`, JSON.stringify(grid));
} catch (err) {
    console.error(err);
}