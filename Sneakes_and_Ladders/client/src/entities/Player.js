// src/entities/Player.js
export default class Player {
  constructor(scene, id, color, name) {
    this.scene = scene;
    this.id = id;
    this.color = color;
    this.name = name;
    this.currentTile = 1;
    this.sprite = null;
  }

  create(tilePositions, tileSize) {
    const pos = tilePositions[1];
    this.sprite = this.scene.add.circle(pos.x, pos.y, tileSize * 0.3, this.color);
    this.sprite.setStrokeStyle(4, 0xffffff);
    this.sprite.setDepth(10);

    this.updateOffset();
  }

  updateOffset() {
    const offsetX = (this.id % 2) * 15 - 7.5;
    const offsetY = Math.floor(this.id / 2) * 15 - 7.5;
    if (this.sprite) {
      this.sprite.x += offsetX;
      this.sprite.y += offsetY;
    }
  }

  moveTo(tilePositions, targetTile, duration, onComplete) {
    this.currentTile = targetTile;
    const pos = tilePositions[targetTile];

    this.scene.tweens.add({
      targets: this.sprite,
      x: pos.x,
      y: pos.y,
      duration: duration,
      ease: 'Power2',
      onComplete: () => {
        this.updateOffset();
        if (onComplete) onComplete();
      }
    });
  }

  animateJump() {
    this.scene.tweens.add({
      targets: this.sprite,
      scaleX: 1.2,
      scaleY: 1.2,
      duration: 150,
      yoyo: true,
      ease: 'Sine.easeInOut'
    });
  }

  destroy() {
    if (this.sprite) {
      this.sprite.destroy();
    }
  }
}