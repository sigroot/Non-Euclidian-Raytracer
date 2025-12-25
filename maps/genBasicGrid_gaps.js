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

var xSize = parseInt(process.argv[2]);
var ySize = parseInt(process.argv[3]);
var zSize = parseInt(process.argv[4]);

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

function makeGap(i, j, k) {
    for (var l = -1, l <= 1, l++) {
        for (var m = -1, m <= 1, m++) {
            for (var n = -1, n <= 1, n++) {
                var tempNode = grid[calcIndex(i+l,j+m,k+n)];
                if (l == 0 && m == 0 && n == 0) {
                    tempNode = null;
                } else {
                    
                }
            }
        }
    }
}

for (var k = 0; k < zSize; k++) {
    for (var j = 0; j < ySize; j++) {
        for (var i = 0; i < xSize; i++) {
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

for (var k = 1; k < zSize - 1; k++) {
    for (var j = 1; j < ySize - 1; j++) {
        for (var i = 1; i < xSize - 1; i++) {
            makeGap(i, j, k);
        }
    }
}

try {
    fs.writeFileSync(`basicGrid-${String(xSize)}-${String(ySize)}-${String(zSize)}_holes.json`, JSON.stringify(grid));
} catch (err) {
    console.error(err);
}