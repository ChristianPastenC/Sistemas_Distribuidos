// src/managers/BoardRenderer.js
import Phaser from 'phaser';

export default class BoardRenderer {
  constructor(scene, tileSize, boardDimension) {
    this.scene = scene;
    this.tileSize = tileSize;
    this.boardDimension = boardDimension;
  }

  drawBoard(tilePositions) {
    const graphics = this.scene.add.graphics();
    const boardSize = this.tileSize * this.boardDimension;
    const startX = tilePositions[1].x - this.tileSize / 2;
    const startY = tilePositions[100].y - this.tileSize / 2;

    const backgroundColor = 0xffffff;
    const lineColor = 0x004D6B;
    const textColor = '#004D6B';

    graphics.fillStyle(backgroundColor, 1);
    graphics.fillRect(startX, startY, boardSize, boardSize);

    graphics.lineStyle(2, lineColor, 1);

    for (let i = 0; i <= this.boardDimension; i++) {
      const y = startY + i * this.tileSize;
      graphics.beginPath();
      graphics.moveTo(startX, y);
      graphics.lineTo(startX + boardSize, y);
      graphics.strokePath();
    }

    for (let i = 0; i <= this.boardDimension; i++) {
      const x = startX + i * this.tileSize;
      graphics.beginPath();
      graphics.moveTo(x, startY);
      graphics.lineTo(x, startY + boardSize);
      graphics.strokePath();
    }

    for (let i = 1; i <= 100; i++) {
      const pos = tilePositions[i];
      this.scene.add.text(pos.x, pos.y, i.toString(), {
        fontFamily: 'Poppins',
        fontSize: `${this.tileSize * 0.35}px`,
        color: textColor,
        fontStyle: '700'
      }).setOrigin(0.5).setDepth(1);
    }
  }

  drawSnakesAndLadders(snakesAndLadders, tilePositions) {
    for (const startTile in snakesAndLadders) {
      const endTile = snakesAndLadders[startTile];
      if (endTile > startTile) {
        this.drawLadder(tilePositions[startTile], tilePositions[endTile]);
      } else {
        this.drawSnake(tilePositions[startTile], tilePositions[endTile]);
      }
    }
  }

  drawLadder(startPos, endPos) {
    const graphics = this.scene.add.graphics({ lineStyle: { width: this.tileSize * 0.1, color: 0xd4a373 } });
    graphics.setDepth(5);
    const angle = Phaser.Math.Angle.BetweenPoints(startPos, endPos);
    const distance = Phaser.Math.Distance.BetweenPoints(startPos, endPos);
    const railOffset = this.tileSize * 0.18;
    const perpAngle = angle + Math.PI / 2;
    const rail1 = new Phaser.Geom.Line(startPos.x + railOffset * Math.cos(perpAngle), startPos.y + railOffset * Math.sin(perpAngle), endPos.x + railOffset * Math.cos(perpAngle), endPos.y + railOffset * Math.sin(perpAngle));
    const rail2 = new Phaser.Geom.Line(startPos.x - railOffset * Math.cos(perpAngle), startPos.y - railOffset * Math.sin(perpAngle), endPos.x - railOffset * Math.cos(perpAngle), endPos.y - railOffset * Math.sin(perpAngle));
    graphics.lineStyle(this.tileSize * 0.08, 0xa17c58, 1);
    graphics.strokeLineShape(rail1);
    graphics.strokeLineShape(rail2);
    const numRungs = Math.floor(distance / (this.tileSize * 0.5));
    for (let i = 1; i <= numRungs; i++) {
      const step = i / (numRungs + 1);
      const p1 = rail1.getPoint(step);
      const p2 = rail2.getPoint(step);
      graphics.strokeLineShape(new Phaser.Geom.Line(p1.x, p1.y, p2.x, p2.y));
    }
  }

  drawSnake(startPos, endPos) {
    const graphics = this.scene.add.graphics();
    graphics.setDepth(6);

    const bodyColor = 0x3a5a40;
    const outlineColor = 0x2b4230;
    const outlineWidth = 2.5;
    const baseWidth = this.tileSize * 0.15;
    const dx = endPos.x - startPos.x;
    const dy = endPos.y - startPos.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx);
    const segments = Math.max(16, Math.floor(distance / 20));
    const rawPoints = [];
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const xBase = startPos.x + dx * t;
      const yBase = startPos.y + dy * t;
      const wave = Math.sin(t * Math.PI * 3) * baseWidth * 1.4 + Math.sin(t * Math.PI * 6 + 0.5) * baseWidth * 0.35;
      const perpX = Math.cos(angle + Math.PI / 2);
      const perpY = Math.sin(angle + Math.PI / 2);
      rawPoints.push({ x: xBase + perpX * wave, y: yBase + perpY * wave });
    }
    const interpPoints = this.catmullRomInterpolate(rawPoints, 6);
    if (interpPoints.length < 2) return;
    const leftVertices = [];
    const rightVertices = [];
    for (let i = 0; i < interpPoints.length; i++) {
      const p_prev = interpPoints[i - 1] || interpPoints[i];
      const p_curr = interpPoints[i];
      const p_next = interpPoints[i + 1] || interpPoints[i];
      let tangentX = p_next.x - p_prev.x;
      let tangentY = p_next.y - p_prev.y;
      const tangentMag = Math.sqrt(tangentX * tangentX + tangentY * tangentY);
      if (tangentMag > 0) {
        tangentX /= tangentMag;
        tangentY /= tangentMag;
      }
      const normalX = -tangentY;
      const normalY = tangentX;
      const t = i / (interpPoints.length - 1);
      const currentWidth = baseWidth * (1 - t * t);
      leftVertices.push({ x: p_curr.x + normalX * currentWidth, y: p_curr.y + normalY * currentWidth });
      rightVertices.push({ x: p_curr.x - normalX * currentWidth, y: p_curr.y - normalY * currentWidth });
    }
    const polygonPoints = [...leftVertices, ...rightVertices.reverse()];
    graphics.fillStyle(bodyColor, 1);
    graphics.beginPath();
    graphics.moveTo(polygonPoints[0].x, polygonPoints[0].y);
    for (let i = 1; i < polygonPoints.length; i++) {
      graphics.lineTo(polygonPoints[i].x, polygonPoints[i].y);
    }
    graphics.closePath();
    graphics.fillPath();
    graphics.lineStyle(outlineWidth, outlineColor, 1);
    graphics.strokePath();
    const headRadius = baseWidth * 1.3;
    graphics.fillStyle(bodyColor, 1);
    graphics.fillCircle(startPos.x, startPos.y, headRadius);
    graphics.lineStyle(outlineWidth, outlineColor, 1);
    graphics.strokeCircle(startPos.x, startPos.y, headRadius);
    graphics.fillStyle(0xffffff, 1);
    graphics.fillCircle(startPos.x - headRadius * 0.3, startPos.y - headRadius * 0.2, headRadius * 0.25);
    graphics.fillCircle(startPos.x + headRadius * 0.3, startPos.y - headRadius * 0.2, headRadius * 0.25);
    graphics.fillStyle(0x000000, 1);
    graphics.fillCircle(startPos.x - headRadius * 0.3, startPos.y - headRadius * 0.2, headRadius * 0.12);
    graphics.fillCircle(startPos.x + headRadius * 0.3, startPos.y - headRadius * 0.2, headRadius * 0.12);
  }

  catmullRomInterpolate(pts, subdivisions = 6) {
    const out = [];
    const n = pts.length;
    if (n < 2) return pts.slice();
    for (let i = 0; i < n - 1; i++) {
      const p0 = i === 0 ? pts[i] : pts[i - 1];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = i + 2 < n ? pts[i + 2] : p2;
      for (let j = 0; j < subdivisions; j++) {
        const t = j / subdivisions;
        const tt = t * t;
        const ttt = tt * t;
        const x = 0.5 * ((2 * p1.x) + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * tt + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * ttt);
        const y = 0.5 * ((2 * p1.y) + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * tt + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * ttt);
        out.push({ x, y });
      }
    }
    out.push(pts[pts.length - 1]);
    return out;
  }
}