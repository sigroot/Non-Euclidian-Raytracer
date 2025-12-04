/*
 * File: !Euclid!.js
 * Author: Sam Armstrong
 * Course: COSC4103 - Computer Graphics
 * Assignment: Putting it all Together
 * Due Date: December 3, 2025
 * 
 * Script for a non-euclidian space raytrace based viewer
 * 
 * Used utils.js and dat.gui from "Real-Time 3D Graphics..."'s common folder for GUI interface
 */

'use strict';
let canvas,
    gl,
    program,
    vao,
    vertexBuffer,
    indexBuffer,
    vShader,
    fShader,
    indices;

var dragging = false;
var mousePos = [0, 0];
var rotateSpeed = 3;
var moveSpeed = 0.1;

var locPos = [0.5, 0.5, 0.5];
var currNode = 0;
var view = [1.0, 0.0, 0.0];
var up = [0.0, 1.0, 0.0];

var mapFolder = "/maps/";

const maps = [
    "basicGrid-6-6-6.json",
    "basicGrid-6-6-6_holes.json",
    "basicGrid-6-6-6_distortedSpace.json",
    "basicGrid-3-3-3_distortedSpaceMore.json",
    "basicGrid-6-6-6_distortedSpaceMore.json",
    "basicGrid-6-6-6_distortedSpaceExtreme.json",
    "basicGrid-3-3-3_distortedSpaceExtreme.json",

];

var currMapName = "";
var currMapNextIndices = [];
var currMapNextDistances = [];
var currMapLastIndices = [];
var currMapWallFaces = [];

var maxDistance = 100;
var viewportDist = 1;
var spaceSkewedVelocity = false;
var gridlines = true;
var colorFade = true;
var resetPosition = false;

function loadTXT(fileName) {
    return fetch(fileName)
    .then((res) => res.text())
    .then((data) => data)
    .catch((error) => {
        console.error("Could not load file:", error);
    })
}

// Return a promise of a json file
function loadJSON(fileName){
    return fetch(fileName)
    .then((res) => res.json())
    .then((data) => data)
    .catch((error) => {
        console.error("Could not load file:", error);
    });
}

async function initProgram () {
    vao = gl.createVertexArray();
    program = gl.createProgram();
    let vShaderText;
    let fShaderText;
    return loadTXT("default.vs").then( (res) => {
        vShaderText = res;
        return loadTXT("default.fs");
    }).then((res) => {
        fShaderText = res;
    }).then( (res) => {
        return [vShaderText, fShaderText];
    })
}

function initBuffers(vShaderText, fShaderText) {
    // Create Vertices
    var vertices = 
       [0.0, 0.0, 
        0.0, 1.0, 
        1.0, 1.0, 
        1.0, 0.0]
    
    indices = [0, 2, 1, 2, 3, 0]
    
    
    vShader = gl.createShader(gl.VERTEX_SHADER);
    fShader = gl.createShader(gl.FRAGMENT_SHADER);

    gl.shaderSource(vShader, vShaderText);
    gl.compileShader(vShader);

    gl.shaderSource(fShader, fShaderText);
    gl.compileShader(fShader);
    if (!gl.getShaderParameter(vShader, gl.COMPILE_STATUS)) console.log(gl.getShaderInfoLog(vShader));
    if (!gl.getShaderParameter(fShader, gl.COMPILE_STATUS)) console.log(gl.getShaderInfoLog(fShader));

    gl.attachShader(program, vShader);
    gl.attachShader(program, fShader);

    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) console.error("Could not initialize shaders.");
    gl.validateProgram(program);
    gl.useProgram(program);

    program.aVertexPosition = gl.getAttribLocation( program, "aVertexPosition" );
    

    vao = gl.createVertexArray();
    gl.bindVertexArray(vao);

    // set up vertex arrays
    vertexBuffer = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, vertexBuffer );
    gl.bufferData( gl.ARRAY_BUFFER,  new Float32Array(vertices), gl.STATIC_DRAW );

    indexBuffer = gl.createBuffer();
    gl.bindBuffer( gl.ELEMENT_ARRAY_BUFFER, indexBuffer );
    gl.bufferData( gl.ELEMENT_ARRAY_BUFFER,  new Uint16Array(indices), gl.STATIC_DRAW );
    
    // Canvas dimentions
    program.height = gl.getUniformLocation(program, "height");
    program.width = gl.getUniformLocation(program, "width");

    // Camera state
    program.locPos = gl.getUniformLocation(program, "locPos");
    program.currNode = gl.getUniformLocation(program, "currNode");
    program.view = gl.getUniformLocation(program, "view");
    program.up = gl.getUniformLocation(program, "up");

    // Map information
    program.mapIndices = gl.getUniformLocation(program, "mapIndices");
    program.mapDistances = gl.getUniformLocation(program, "mapDistances");
    program.nMapIndices = gl.getUniformLocation(program, "nMapIndices");
    program.mapFaces = gl.getUniformLocation(program, "mapFaces");

    // Render settings
    program.maxDistance = gl.getUniformLocation(program, "maxDistance");
    program.viewportDist = gl.getUniformLocation(program, "viewportDist");
    program.spaceSkewedVelocity = gl.getUniformLocation(program, "spaceSkewedVelocity");
    program.gridlines = gl.getUniformLocation(program, "gridlines");
    program.colorFade = gl.getUniformLocation(program, "colorFade");

    gl.vertexAttribPointer( program.aVertexPosition, 2, gl.FLOAT, false, 0,0);
    gl.enableVertexAttribArray( program.aVertexPosition );

    gl.bindVertexArray(null);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);


    gl.clearColor(0.3, 0.3, 0.3, 1.0);
}

function updateVariables() {
    gl.uniform1f( program.height, canvas.height );
    gl.uniform1f( program.width, canvas.width );
    gl.uniform3f( program.locPos, locPos[0], locPos[1], locPos[2] );
    gl.uniform3f( program.view, view[0], view[1], view[2] );
    gl.uniform3f( program.up, up[0], up[1], up[2] );
    gl.uniform1i( program.currNode, currNode );
    gl.uniform1f( program.maxDistance, maxDistance );
    gl.uniform1f( program.viewportDist, viewportDist );
    gl.uniform1i( program.spaceSkewedVelocity, spaceSkewedVelocity); 
    gl.uniform1i( program.gridlines, gridlines); 
    gl.uniform1i( program.colorFade, colorFade); 
    if (currMapName != "") {
        gl.uniform3iv( program.mapIndices, currMapNextIndices );
        gl.uniform3fv( program.mapDistances, currMapNextDistances );
        gl.uniform3iv( program.nMapIndices, currMapLastIndices );
        gl.uniform1iv( program.mapFaces, currMapWallFaces );
    }
}

function scaleVector (v, s) {
    return [s*v[0], s*v[1], s*v[2]];
}

function dotVector (v, a) {
    return v[0]*a[0] + v[1]*a[1] + v[2]*a[2];
}

function crossVector (v, a) {
    return [v[1]*a[2]-v[2]*a[1], -v[0]*a[2]+v[2]*a[0], v[0]*a[1]-v[1]*a[0]];
}

function addVector (v, a) {
    return [v[0] + a[0], v[1] + a[1], v[2] + a[2]];
}

function rotateVector(v, a, t) {
    let temp1 = scaleVector(a, dotVector(a, v));
    let temp2 = scaleVector(crossVector(a, v), Math.cos(t));
    let temp3 = crossVector(temp2, a);
    let temp4 = scaleVector(crossVector(a, v), Math.sin(t));
    return addVector(addVector(temp1, temp3), temp4);
}

function normalizeVector(v) {
    return scaleVector(v, 1/distVector(v));
}

function distVector(v) {
    return Math.sqrt(v[0]*v[0] + v[1]*v[1] + v[2]*v[2]);
}

function fireRay (origin, startNode, startMotion, maxDistance) {
    let distanceTraveled = 0;
    let rPosition = origin;
    let rMotion = startMotion;
    let rNode = startNode;

    while (distanceTraveled < maxDistance) {
        let closestWall = 0; // 1 is posX, 2 is posY, 3 is posZ, 4 is negX, 5 is negY, 6 is negZ.
        let closestIncrement = 999999999.9; // Amount to multiply by motion vector to reach a wall. Starts at infinity.
        if (rMotion[0] >= 0.0) {
            let tempDist = (currMapNextDistances[3*rNode] - rPosition[0])/rMotion[0];
            if (tempDist < closestIncrement) {
                closestIncrement = tempDist;
                closestWall = 1;
            }
        } else {
            let tempDist = Math.abs(-rPosition[0]/rMotion[0]);
            if (tempDist < closestIncrement) {
                closestIncrement = tempDist;
                closestWall = 4;
            }
        }
        if (rMotion[1] >= 0.0) {
            let tempDist = (currMapNextDistances[3*rNode+1] - rPosition[1])/rMotion[1];
            if (tempDist < closestIncrement) {
                closestIncrement = tempDist;
                closestWall = 2;
            }
        } else {
            let tempDist = Math.abs(-rPosition[1]/rMotion[1]);
            if (tempDist < closestIncrement) {
                closestIncrement = tempDist;
                closestWall = 5;
            }
        }
        if (rMotion[2] >= 0.0) {
            let tempDist = (currMapNextDistances[3*rNode+2] - rPosition[2])/rMotion[2];
            if (tempDist < closestIncrement) {
                closestIncrement = tempDist;
                closestWall = 3;
            }
        } else {
            let tempDist = Math.abs(-rPosition[2]/rMotion[2]);
            if (tempDist < closestIncrement) {
                closestIncrement = tempDist;
                closestWall = 6;
            }
        }
        
        if (closestIncrement > (maxDistance - distanceTraveled)) {
            rPosition = addVector(rPosition, scaleVector(rMotion, (maxDistance - distanceTraveled)));
            break;
        }

        // Check if side has wall
        //      If so, stop, record *distance* (required for shading)
        let breakLoop = false;
        distanceTraveled += closestIncrement;
        
        switch (closestWall) {
            case 1:
                if ((currMapWallFaces[rNode] & 32) == 0) {
                    rPosition = addVector(rPosition, scaleVector(rMotion, closestIncrement));
                    let nextNode = currMapNextIndices[3*rNode];
                    rPosition = [0.0, rPosition[1]*currMapNextDistances[3*nextNode+1]/currMapNextDistances[3*rNode+1], rPosition[2]*currMapNextDistances[3*nextNode+2]/currMapNextDistances[3*rNode+2]];
                    if (spaceSkewedVelocity) {
                        rMotion = normalizeVector([rMotion[0]*currMapNextDistances[3*nextNode]/currMapNextDistances[3*rNode], rMotion[1]*currMapNextDistances[3*nextNode+1]/currMapNextDistances[3*rNode+1], rMotion[2]*currMapNextDistances[3*nextNode+2]/currMapNextDistances[3*rNode+2] ]);
                    }
                    rNode = nextNode;
                } else {
                    breakLoop = true;
                }
                break;
            case 2:
                if ((currMapWallFaces[rNode] & 8) == 0) {
                    rPosition = addVector(rPosition, scaleVector(rMotion, closestIncrement));
                    let nextNode = currMapNextIndices[3*rNode+1];
                    rPosition = [rPosition[0]*currMapNextDistances[3*nextNode]/currMapNextDistances[3*rNode], 0.0, rPosition[2]*currMapNextDistances[3*nextNode+2]/currMapNextDistances[3*rNode+2]];
                    if (spaceSkewedVelocity) {
                        rMotion = normalizeVector([rMotion[0]*currMapNextDistances[3*nextNode]/currMapNextDistances[3*rNode], rMotion[1]*currMapNextDistances[3*nextNode+1]/currMapNextDistances[3*rNode+1], rMotion[2]*currMapNextDistances[3*nextNode+2]/currMapNextDistances[3*rNode+2] ]);
                    }
                    rNode = nextNode;
                } else {
                    breakLoop = true;
                }
                break;
            case 3:
                if ((currMapWallFaces[rNode] & 2) == 0) {
                    rPosition = addVector(rPosition, scaleVector(rMotion, closestIncrement));
                    let nextNode = currMapNextIndices[3*rNode+2];
                    rPosition = [rPosition[0]*currMapNextDistances[3*nextNode]/currMapNextDistances[3*rNode], rPosition[1]*currMapNextDistances[3*nextNode+1]/currMapNextDistances[3*rNode+1], 0.0];
                    if (spaceSkewedVelocity) {
                        rMotion = normalizeVector([rMotion[0]*currMapNextDistances[3*nextNode]/currMapNextDistances[3*rNode], rMotion[1]*currMapNextDistances[3*nextNode+1]/currMapNextDistances[3*rNode+1], rMotion[2]*currMapNextDistances[3*nextNode+2]/currMapNextDistances[3*rNode+2] ]);
                    }
                    rNode = nextNode;
                } else {
                    breakLoop = true;
                }
                break;
            case 4:
                if ((currMapWallFaces[rNode] & 16) == 0) {
                    rPosition = addVector(rPosition, scaleVector(rMotion, closestIncrement));
                    let nextNode = currMapLastIndices[3*rNode];
                    rPosition = [currMapNextDistances[3*nextNode], rPosition[1]*currMapNextDistances[3*nextNode+1]/currMapNextDistances[3*rNode+1], rPosition[2]*currMapNextDistances[3*nextNode+2]/currMapNextDistances[3*rNode+2]];
                    if (spaceSkewedVelocity) {
                        rMotion = normalizeVector([rMotion[0]*currMapNextDistances[3*nextNode]/currMapNextDistances[3*rNode], rMotion[1]*currMapNextDistances[3*nextNode+1]/currMapNextDistances[3*rNode+1], rMotion[2]*currMapNextDistances[3*nextNode+2]/currMapNextDistances[3*rNode+2] ]);
                    }
                    rNode = nextNode;
                } else {
                    breakLoop = true;
                }
                break;
            case 5:
                if ((currMapWallFaces[rNode] & 4) == 0) {
                    rPosition = addVector(rPosition, scaleVector(rMotion, closestIncrement));
                    let nextNode = currMapLastIndices[3*rNode+1];
                    rPosition = [rPosition[0]*currMapNextDistances[3*nextNode]/currMapNextDistances[3*rNode], currMapNextDistances[3*nextNode+1], rPosition[2]*currMapNextDistances[3*nextNode+2]/currMapNextDistances[3*rNode+2]];
                    if (spaceSkewedVelocity) {
                        rMotion = normalizeVector([rMotion[0]*currMapNextDistances[3*nextNode]/currMapNextDistances[3*rNode], rMotion[1]*currMapNextDistances[3*nextNode+1]/currMapNextDistances[3*rNode+1], rMotion[2]*currMapNextDistances[3*nextNode+2]/currMapNextDistances[3*rNode+2] ]);
                    }
                    rNode = nextNode;
                } else {
                    breakLoop = true;
                }
                break;
            case 6:
                if ((currMapWallFaces[rNode] & 1) == 0) {
                    rPosition = addVector(rPosition, scaleVector(rMotion, closestIncrement));
                    let nextNode = currMapLastIndices[3*rNode+2];
                    rPosition = [rPosition[0]*currMapNextDistances[3*nextNode]/currMapNextDistances[3*rNode], rPosition[1]*currMapNextDistances[3*nextNode+1]/currMapNextDistances[3*rNode+1], currMapNextDistances[3*nextNode+2]];
                    if (spaceSkewedVelocity) {
                        rMotion = normalizeVector([rMotion[0]*currMapNextDistances[3*nextNode]/currMapNextDistances[3*rNode], rMotion[1]*currMapNextDistances[3*nextNode+1]/currMapNextDistances[3*rNode+1], rMotion[2]*currMapNextDistances[3*nextNode+2]/currMapNextDistances[3*rNode+2] ]);
                    }
                    rNode = nextNode;
                } else {
                    breakLoop = true;
                }
                break;
            default:
                breakLoop = true;
        }

        if (breakLoop) {
            break;
        }
    }
    return [rPosition, rNode, rMotion];
}

function startEventListeners() {
    canvas.addEventListener("mousedown", (event) => {dragging = true; mousePos = [event.layerX, event.layerY];});
    canvas.addEventListener("mouseup", (event) => {dragging = false;});
    canvas.addEventListener("mouseout", (event) => {dragging = false;});
    canvas.addEventListener("mousemove", (event) => {
        if (dragging) {
            let deltaX = (event.layerX - mousePos[0]);
            let deltaY = (event.layerY - mousePos[1]);
            let horzRotation = -deltaX/canvas.width*rotateSpeed;
            let vertRotation = deltaY/canvas.height*rotateSpeed;
            view = rotateVector(view, up, horzRotation);
            view = addVector(view, scaleVector(up, vertRotation));
            view = normalizeVector(view);
            mousePos = [event.layerX, event.layerY];
        }
    });
    canvas.addEventListener("wheel", (event) => {
        let moveDist = -Math.abs(event.deltaY)/event.deltaY*moveSpeed;
        let [newPos, newNode, newView] = fireRay(locPos, currNode, scaleVector(view,Math.sign(moveDist)), Math.abs(moveDist));
        locPos = newPos;
        currNode = newNode;
        view = scaleVector(newView, Math.sign(moveDist));
    });
}

function render() {
    gl.clear( gl.COLOR_BUFFER_BIT );
    gl.viewport(-canvas.width, -canvas.height, 2*canvas.width, 2*canvas.height);
    gl.bindVertexArray(vao);

    updateVariables();

    gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0)

    gl.bindVertexArray(null);
    requestAnimationFrame(render);
}

function loadMap(mapName) {
    currMapName = "";
    currMapNextIndices = [];
    currMapNextDistances = [];
    currMapLastIndices = [];
    currMapWallFaces = [];
    loadJSON(mapFolder.concat(mapName)).then(res => {
        for (var i of res) {
            currMapNextIndices.push(i.nextIndices[0], i.nextIndices[1], i.nextIndices[2]);
            currMapNextDistances.push(i.nextDistances[0], i.nextDistances[1], i.nextDistances[2]);
            currMapLastIndices.push(i.lastIndices[0], i.lastIndices[1], i.lastIndices[2]);
            currMapWallFaces.push(i.wallInt);
        }
        currMapName = mapName
    });
}


function createGui() {
    utils.configureControls({
        'Map': {
            value: currMapName,
            options: maps,
            onChange: v => loadMap(v)
        },
        'Canvas Size': {
            value: canvas.width,
            min: 100, max: 1000, step: 1,
            onChange: v => canvas.setSize(v)
        },
        'Raycast Depth': {
            value: maxDistance,
            min: 1, max: 200, step: 1,
            onChange: v => {maxDistance = v;}
        },
        'Movement Speed': {
            value: moveSpeed,
            min: 0.1, max: 3, step: 0.1,
            onChange: v => {moveSpeed = v;}
        },
        'Distort Ray Velocity with Space': {
            value: spaceSkewedVelocity,
            onChange: v => {spaceSkewedVelocity = v;}
        },
        'Show Gridlines': {
            value: gridlines,
            onChange: v => {gridlines = v;}
        },
        'Fade Color with Distance': {
            value: colorFade,
            onChange: v => {colorFade = v;}
        },
        'Reset position': {
            value: resetPosition,
            onChange: v => {
                locPos = [0.5, 0.5, 0.5];
                currNode = 0;
                view = [1.0, 0.0, 0.0];
                up = [0.0, 1.0, 0.0];
            }
        }
    });
}

async function init() {
    canvas = (() => {
        var canvas = document.getElementById('webgl_canvas');
        if (!canvas) {
            console.error('Could not get canvas');
            return null;
        }
        canvas.setSize = (v) => {
            canvas.width = v;
            canvas.height = v;
        }
        return canvas;
    })();

    gl = (() => {
        var gl = canvas.getContext('webgl2');
        if (!gl) {
            console.error('Could not get gl');
            return null;
        }
        return gl;
    })();

    canvas.setSize(100);
    //loadMap(maps[0]);
    maxDistance = 100;

    createGui();


    startEventListeners();
    
    initProgram().then((res) => {
      return initBuffers(res[0], res[1]);
    }).then( (res) => {
      render();
    });
}

window.onload=init;