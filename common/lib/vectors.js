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