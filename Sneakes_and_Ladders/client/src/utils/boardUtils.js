// src/utils/boardUtils.js
import Phaser from 'phaser';

export const getTilePositions = (boardDimension = 10, tileSize = 80, offsetX = 0, offsetY = 0) => {
  const positions = {};
  for (let i = 1; i <= 100; i++) {
    const row = Math.floor((i - 1) / boardDimension);
    let col = (i - 1) % boardDimension;
    if (row % 2 !== 0) {
      col = (boardDimension - 1) - col;
    }
    positions[i] = {
      x: offsetX + col * tileSize + tileSize / 2,
      y: offsetY + (boardDimension - 1 - row) * tileSize + tileSize / 2
    };
  }
  return positions;
};

export const generateSnakesAndLadders = (numSnakes = 5, numLadders = 5) => {
  const specials = {};
  const occupiedCells = new Set([1, 100]);

  const isTooClose = (start, end) => {
    const minDistance = 5;
    for (const existingStart in specials) {
      const existingEnd = specials[existingStart];
      if (
        Math.abs(start - existingStart) < minDistance ||
        Math.abs(end - existingEnd) < minDistance ||
        Math.abs(start - existingEnd) < minDistance ||
        Math.abs(end - parseInt(existingStart)) < minDistance
      ) {
        return true;
      }
    }
    return false;
  };

  for (let i = 0; i < numLadders; i++) {
    let start, end;
    let attempts = 0;
    const maxAttempts = 100;
    do {
      start = Phaser.Math.Between(2, 89);
      end = Phaser.Math.Between(start + 10, Math.min(start + 40, 99));
      attempts++;
      if (attempts > maxAttempts) break;
    } while (
      occupiedCells.has(start) ||
      occupiedCells.has(end) ||
      isTooClose(start, end)
    );
    if (attempts <= maxAttempts) {
      specials[start] = end;
      occupiedCells.add(start);
      occupiedCells.add(end);
    }
  }

  for (let i = 0; i < numSnakes; i++) {
    let start, end;
    let attempts = 0;
    const maxAttempts = 100;
    do {
      start = Phaser.Math.Between(11, 99);
      end = Phaser.Math.Between(Math.max(start - 40, 2), start - 10);
      attempts++;
      if (attempts > maxAttempts) break;
    } while (
      occupiedCells.has(start) ||
      occupiedCells.has(end) ||
      isTooClose(start, end)
    );
    if (attempts <= maxAttempts) {
      specials[start] = end;
      occupiedCells.add(start);
      occupiedCells.add(end);
    }
  }

  return specials;
};