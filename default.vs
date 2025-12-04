#version 300 es

//
// File: default.vs
// Author: Sam Armstrong
// Course: COSC4103 - Computer Graphics
// Assignment: Putting it all Together
// Due Date: December 3, 2025
// 
// Basically just renders a square
// 

in vec4 aVertexPosition;

void main() {

	gl_Position = aVertexPosition;
}