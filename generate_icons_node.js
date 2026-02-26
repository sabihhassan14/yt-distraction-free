#!/usr/bin/env node

/**
 * Icon Generator for YouTube Distraction-Free Extension
 * Generates PNG icons using canvas
 * 
 * Usage: node generate_icons_node.js
 * 
 * Requires: npm install canvas
 */

const fs = require('fs');
const path = require('path');

function generateIcon(size, outputPath) {
    try {
        // Try to use canvas library
        const Canvas = require('canvas');
        const canvas = Canvas.createCanvas(size, size);
        const ctx = canvas.getContext('2d');
        
        // Background
        ctx.fillStyle = '#0f3460';
        ctx.fillRect(0, 0, size, size);
        
        // Circle border
        ctx.strokeStyle = '#00d4ff';
        ctx.lineWidth = Math.max(2, size / 64);
        ctx.beginPath();
        ctx.arc(size / 2, size / 2, size / 3, 0, Math.PI * 2);
        ctx.stroke();
        
        // Play triangle
        ctx.fillStyle = '#00d4ff';
        const margin = size / 3;
        ctx.beginPath();
        ctx.moveTo(size / 2 - margin / 2, size / 2 - margin);
        ctx.lineTo(size / 2 - margin / 2, size / 2 + margin);
        ctx.lineTo(size / 2 + margin, size / 2);
        ctx.closePath();
        ctx.fill();
        
        // Slash line
        ctx.strokeStyle = '#ff6b6b';
        ctx.lineWidth = Math.max(3, size / 42);
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(size / 4, size - size / 4);
        ctx.lineTo(size - size / 4, size / 4);
        ctx.stroke();
        
        // Save
        const buffer = canvas.toBuffer('image/png');
        fs.writeFileSync(outputPath, buffer);
        return true;
    } catch (err) {
        console.error(`Error generating icon: ${err.message}`);
        return false;
    }
}

async function main() {
    console.log('YouTube Distraction-Free Icon Generator (Node.js)');
    console.log('='.repeat(50));
    
    // Check if canvas is installed
    try {
        require.resolve('canvas');
    } catch (err) {
        console.log('\n⚠ Canvas library not found!');
        console.log('\nTo install:');
        console.log('  npm install canvas');
        console.log('\nOr use Python:');
        console.log('  pip install Pillow');
        console.log('  python generate_icons.py');
        process.exit(1);
    }
    
    const imagesDir = path.join(__dirname, 'images');
    
    if (!fs.existsSync(imagesDir)) {
        fs.mkdirSync(imagesDir, { recursive: true });
    }
    
    const sizes = [128, 48, 16];
    let success = true;
    
    console.log('\nGenerating PNG icons...\n');
    
    for (const size of sizes) {
        const outputPath = path.join(imagesDir, `icon${size}.png`);
        process.stdout.write(`Creating icon${size}.png (${size}x${size})... `);
        
        if (generateIcon(size, outputPath)) {
            console.log('✓');
        } else {
            console.log('✗');
            success = false;
        }
    }
    
    console.log('\n' + '='.repeat(50));
    if (success) {
        console.log('✓ All icons generated successfully!\n');
        console.log('You can now load the extension in Chrome:');
        console.log('1. Go to chrome://extensions/');
        console.log('2. Enable Developer mode');
        console.log('3. Click "Load unpacked"');
        console.log(`4. Select: ${__dirname}`);
    }
    
    process.exit(success ? 0 : 1);
}

main();
