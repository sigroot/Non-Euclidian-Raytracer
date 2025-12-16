#version 300 es
precision highp float;
precision highp int;

//
// File: default.fs
// Author: Sam Armstrong
// Course: COSC4103 - Computer Graphics
// Assignment: Putting it all Together
// Due Date: December 3, 2025
// 
// The Parallelized raytracing code for a non-euclidian space raytrace based viewer
// 

// Maximum number of map nodes
const int maxMapSize = 6*6*6;
// Define map
// 2 vectors for each node (array position is index): 
// node index in (x-axis dir, y-axis dir, z-axis dir)
// dist to (x-axis node, y-axis node, z-axis node)
// negative node index of (x-axis , y-axis, z-axis)
// opaque faces in bitmap of ( * * x -x y -y z -z)

uniform ivec3 mapIndices[maxMapSize];
uniform vec3 mapDistances[maxMapSize];
uniform ivec3 nMapIndices[maxMapSize];
uniform int mapFaces[maxMapSize];

// Define location of camera
uniform vec3 locPos;
uniform int currNode;
uniform vec3 view;
uniform vec3 up;

// Size of canvas in pixels
uniform float height;
uniform float width;

uniform float maxDistance;
uniform bool spaceSkewedVelocity;
uniform bool gridlines;
uniform bool colorFade;

out vec4 fragColor;

struct convertPositionResult {
    int newNode;
    vec3 newPosition;
};

convertPositionResult convertPosition (int rNode, vec3 rPosition, int xyz, bool pos) {
    int nextNode;
    if (pos) {
        nextNode = mapIndices[rNode][xyz];
    } else {
        nextNode = nMapIndices[rNode][xyz];
    }

    vec3 newPosition = vec3(rPosition.x*mapDistances[nextNode].x/mapDistances[rNode].x, rPosition.y*mapDistances[nextNode].y/mapDistances[rNode].y, rPosition.z*mapDistances[nextNode].z/mapDistances[rNode].z);
    
    if (pos) {
        newPosition[xyz] = 0.0;
    } else {
        newPosition[xyz] = mapDistances[nextNode][xyz];
    }

    convertPositionResult result;
    result.newNode = nextNode;
    result.newPosition = newPosition;
    return result;
}

struct closestWallResult {
    int closestWall;
    float closestIncrement;
};

closestWallResult getClosestWall (int rNode, vec3 rPosition, vec3 rMotion) {

    int closestWall = 0; // 1 is posX, 2 is posY, 3 is posZ, 4 is negX, 5 is negY, 6 is negZ.
    float closestIncrement = 999999999.9; // Amount to multiply by motion vector to reach a wall. Starts at infinity.
    if (rMotion.x >= 0.0) {
        float tempDist = (mapDistances[rNode].x - rPosition.x)/rMotion.x;
        if (tempDist < closestIncrement) {
            closestIncrement = tempDist;
            closestWall = 1;
        }
    } else {
        float tempDist = abs(-rPosition.x/rMotion.x);
        if (tempDist < closestIncrement) {
            closestIncrement = tempDist;
            closestWall = 4;
        }
    }
    if (rMotion.y >= 0.0) {
        float tempDist = (mapDistances[rNode].y - rPosition.y)/rMotion.y;
        if (tempDist < closestIncrement) {
            closestIncrement = tempDist;
            closestWall = 2;
        }
    } else {
        float tempDist = abs(-rPosition.y/rMotion.y);
        if (tempDist < closestIncrement) {
            closestIncrement = tempDist;
            closestWall = 5;
        }
    }
    if (rMotion.z >= 0.0) {
        float tempDist = (mapDistances[rNode].z - rPosition.z)/rMotion.z;
        if (tempDist < closestIncrement) {
            closestIncrement = tempDist;
            closestWall = 3;
        }
    } else {
        float tempDist = abs(-rPosition.z/rMotion.z);
        if (tempDist < closestIncrement) {
            closestIncrement = tempDist;
            closestWall = 6;
        }
    }

    closestWallResult result;
    result.closestWall = closestWall;
    result.closestIncrement = closestIncrement;
    return result;
}

struct moveRayResult {
    bool breakLoop;
    int rNode;
    vec3 rPosition;
    vec3 rMotion;
    float distanceTraveled;
};

moveRayResult moveRay (int rNode, vec3 rPosition, vec3 rMotion, float distanceTraveled, int closestWall, float closestIncrement) {
    // Check if side has wall
    //      If so, stop, record *distance* (required for shading)
    bool breakLoop = false;
    bool hitWall = false;
    distanceTraveled += closestIncrement;
    int nextNode;

    switch (closestWall) {
        case 1:
            if ((mapFaces[rNode] & 32) == 0) {
                rPosition += rMotion * closestIncrement;
                convertPositionResult cPResult = convertPosition(rNode, rPosition, 0, true);
                nextNode = cPResult.newNode;
                rPosition = cPResult.newPosition;
                hitWall = true;
            } else {
                breakLoop = true;
            }
            break;
        case 2:
            if ((mapFaces[rNode] & 8) == 0) {
                rPosition += rMotion * closestIncrement;
                convertPositionResult cPResult = convertPosition(rNode, rPosition, 1, true);
                nextNode = cPResult.newNode;
                rPosition = cPResult.newPosition;
                hitWall = true;
            } else {
                breakLoop = true;
            }
            break;
        case 3:
            if ((mapFaces[rNode] & 2) == 0) {
                rPosition += rMotion * closestIncrement;
                convertPositionResult cPResult = convertPosition(rNode, rPosition, 2, true);
                nextNode = cPResult.newNode;
                rPosition = cPResult.newPosition;
                hitWall = true;
            } else {
                breakLoop = true;
            }
            break;
        case 4:
            if ((mapFaces[rNode] & 16) == 0) {
                rPosition += rMotion * closestIncrement;
                convertPositionResult cPResult = convertPosition(rNode, rPosition, 0, false);
                nextNode = cPResult.newNode;
                rPosition = cPResult.newPosition;
                hitWall = true;
            } else {
                breakLoop = true;
            }
            break;
        case 5:
            if ((mapFaces[rNode] & 4) == 0) {
                rPosition += rMotion * closestIncrement;
                convertPositionResult cPResult = convertPosition(rNode, rPosition, 1, false);
                nextNode = cPResult.newNode;
                rPosition = cPResult.newPosition;
                hitWall = true;
            } else {
                breakLoop = true;
            }
            break;
        case 6:
            if ((mapFaces[rNode] & 1) == 0) {
                rPosition += rMotion * closestIncrement;
                convertPositionResult cPResult = convertPosition(rNode, rPosition, 2, false);
                nextNode = cPResult.newNode;
                rPosition = cPResult.newPosition;
                hitWall = true;
            } else {
                breakLoop = true;
            }
            break;
        default:
            breakLoop = true;
    }
    if (hitWall == true) {
        if (spaceSkewedVelocity) {
            rMotion = normalize(vec3( rMotion.x*mapDistances[nextNode].x/mapDistances[rNode].x, rMotion.y*mapDistances[nextNode].y/mapDistances[rNode].y, rMotion.z*mapDistances[nextNode].z/mapDistances[rNode].z ));
        }
        rNode = nextNode;
    }
    moveRayResult result;
    result.breakLoop = breakLoop;
    result.rNode = rNode;
    result.rPosition = rPosition;
    result.rMotion = rMotion;
    result.distanceTraveled = distanceTraveled;

    return result;
}

int floatToInt (float f) {
    int tempInt = 0;
    for (float tempFloat = 0.0; tempFloat < f; tempFloat++){
        tempInt++;
    }
    return tempInt;
}

void main() {
    vec2 clip = vec2(2.0*(gl_FragCoord.x/width-0.5), 2.0*(gl_FragCoord.y/height-0.5));
    
    vec3 right = normalize(cross(view, up));
    vec3 upAdj = normalize(cross(view, right));

    vec3 rPosition = locPos;
    int rNode = currNode;
    vec3 rMotion = normalize(clip.x*right + clip.y*upAdj + view);

    vec3 newColor = vec3(0.0, 0.0, 0.0);

    // Loop the ray following the path

    float distanceTraveled = 0.0;
    while (distanceTraveled < maxDistance) {
        // Ray is in Node
        // Find point on side ray is pointing towards
        int closestWall = 0; // 1 is posX, 2 is posY, 3 is posZ, 4 is negX, 5 is negY, 6 is negZ.
        float closestIncrement = 999999999.9; // Amount to multiply by motion vector to reach a wall. Starts at infinity.
        closestWallResult cWResult = getClosestWall(rNode, rPosition, rMotion);
        closestWall = cWResult.closestWall;
        closestIncrement = cWResult.closestIncrement;


        // Draw if traveled distance is small (shows at edges)
        if ((closestIncrement < 0.01) && gridlines) {
            if (colorFade) {
                newColor = vec3(1.0/(1.0+distanceTraveled), 0.0, 0.0);
            } else {
                newColor = vec3(1.0, 0.0, 0.0);
            }
            break;
        }

        moveRayResult mRResult = moveRay(rNode, rPosition, rMotion, distanceTraveled, closestWall, closestIncrement);
        bool breakLoop = mRResult.breakLoop;
        rNode = mRResult.rNode;
        rPosition = mRResult.rPosition;
        rMotion = mRResult.rMotion;
        distanceTraveled = mRResult.distanceTraveled;

        if (breakLoop) {
            float colorShade = 0.9;
            if (colorFade) {
                colorShade = 1.0/(sqrt(1.0+distanceTraveled/(maxDistance/100.0)));
            }
            //float colorShade = 1.0;
            newColor = vec3(colorShade, colorShade, colorShade);
            //newColor = vec3(1.0, 1.0, 1.0);
            break;
        }

        if (rNode == currNode) {
            vec3 distToTravel = dot(rPosition-locPos, rMotion)*rMotion;
            float distToSelf = length((rPosition-locPos)-distToTravel);
            if (distToSelf < 0.2) {
                if (colorFade) {
                    newColor = vec3(0.0, 0.0, 1.0/sqrt(1.0+(distanceTraveled+length(distToTravel))/(maxDistance/100.0)));
                } else {
                    newColor = vec3(0.0, 0.0, 1.0);
                }
                break;
            }
        }
        for (int i = 0; i < 3; i++) {

        }



    }

    fragColor = vec4(newColor, 1.0);
}