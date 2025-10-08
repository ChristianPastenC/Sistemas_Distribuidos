// src/managers/DiceManager.js
import Phaser from 'phaser';

export default class DiceManager {
  constructor(scene, x, y) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.isRolling = false;
    this.mesh = null;
    this.shadowFX = null;
  }

  create() {
    this.mesh = this.scene.add.mesh(this.x, this.y, "dice-albedo");
    this.shadowFX = this.mesh.postFX.addShadow(0, 0, 0.006, 2, 0x111111, 10, 0.8);

    this.mesh.addVerticesFromObj("dice-obj", 0.25);
    this.mesh.panZ(6);

    this.setDiceFace(1);

    this.mesh.setInteractive();
    this.mesh.on('pointerdown', () => {
      if (this.onRollCallback && !this.isRolling) {
        this.onRollCallback();
      }
    });

    this.scene.tweens.add({
      targets: this.mesh,
      y: this.y - 5,
      duration: 2000,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1
    });
  }

  setDiceFace(number) {
    const rotations = {
      1: { x: 0, y: -90 },
      2: { x: 90, y: 0 },
      3: { x: 180, y: 0 },
      4: { x: 180, y: 180 },
      5: { x: -90, y: 0 },
      6: { x: 0, y: 90 }
    };

    const rot = rotations[number];
    this.mesh.modelRotation.x = Phaser.Math.DegToRad(rot.x);
    this.mesh.modelRotation.y = Phaser.Math.DegToRad(rot.y);
  }

  roll(callback) {
    if (this.isRolling) return;

    this.isRolling = true;
    const result = Phaser.Math.Between(1, 6);
    const duration = 1200;

    this.scene.tweens.add({
      targets: this.shadowFX,
      x: -8,
      y: 10,
      duration: duration - 250,
      ease: "Sine.easeInOut",
      yoyo: true
    });

    this.scene.tweens.add({
      targets: { progress: 0 },
      progress: 1,
      duration: duration,
      onUpdate: (tween) => {
        const progress = tween.getValue();
        const easedProgress = Phaser.Math.Easing.Cubic.Out(progress);

        this.mesh.modelRotation.x -= 0.04 * (1 - easedProgress * 0.7);
        this.mesh.modelRotation.y -= 0.09 * (1 - easedProgress * 0.7);
      }
    });

    this.scene.tweens.add({
      targets: this.mesh,
      scale: 1.2,
      duration: duration - 200,
      ease: 'Quadratic.InOut',
      yoyo: true,
      onComplete: () => {
        this.setDiceFace(result);
        this.mesh.scale = 1;

        this.scene.tweens.add({
          targets: this.mesh,
          scale: 1.1,
          duration: 100,
          ease: 'Back.easeOut',
          yoyo: true,
          onComplete: () => {
            this.mesh.scale = 1;
            this.isRolling = false;
            if (callback) callback(result);
          }
        });
      }
    });
  }

  enable() {
    this.mesh.setInteractive();
  }

  disable() {
    this.mesh.disableInteractive();
  }

  onRoll(callback) {
    this.onRollCallback = callback;
  }
}