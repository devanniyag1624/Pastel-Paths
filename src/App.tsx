/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import * as Phaser from 'phaser';

// Aesthetic Constants - Vibrant Theme
const COLORS = {
  BACKGROUND: '#020617', // Deep Navy
  PLAYER: 0xFF006E,      // Vibrant Magenta
  PLAYER_SHADOW: 0xC9184A,
  PLATFORM: 0x3A86FF,    // Vibrant Azure
  PLATFORM_SHADOW: 0x2463EB,
  STAR: 0xFFBE0B,        // Golden Amber
  ACCENT: '#FB5607',     // Electric Orange
};

export default function App() {
  const gameContainerRef = useRef<HTMLDivElement>(null);
  const gameInstanceRef = useRef<Phaser.Game>(null);
  const [score, setScore] = useState(0);

  useEffect(() => {
    if (!gameContainerRef.current) return;

    // Game Configuration
    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      parent: gameContainerRef.current,
      width: '100%',
      height: '100%',
      backgroundColor: COLORS.BACKGROUND,
      physics: {
        default: 'arcade',
        arcade: {
          gravity: { x: 0, y: 800 },
          debug: false,
        },
      },
      scene: {
        preload: preload,
        create: create,
        update: update,
      },
      scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
    };

    // Initialize Game
    const game = new Phaser.Game(config);
    gameInstanceRef.current = game;

    // Phaser scene functions
    let player: Phaser.Physics.Arcade.Sprite;
    let platforms: Phaser.Physics.Arcade.StaticGroup;
    let cursors: Phaser.Types.Input.Keyboard.CursorKeys;
    let wasdKeys: { [key: string]: Phaser.Input.Keyboard.Key };
    let stars: Phaser.Physics.Arcade.Group;
    let particles: Phaser.GameObjects.Particles.ParticleEmitter;

    function preload(this: Phaser.Scene) {
      const graphics = this.make.graphics({ x: 0, y: 0 });

      // Create rounded player texture with shadow
      // Shadow
      graphics.fillStyle(COLORS.PLAYER_SHADOW);
      graphics.fillRoundedRect(0, 4, 48, 48, 16);
      // Body
      graphics.fillStyle(COLORS.PLAYER);
      graphics.fillRoundedRect(0, 0, 48, 48, 16);
      // Eyes
      graphics.fillStyle(0xFFFFFF);
      graphics.fillCircle(16, 20, 4);
      graphics.fillCircle(32, 20, 4);
      
      graphics.generateTexture('playerTexture', 48, 52);
      graphics.clear();

      // Create rounded platform texture with shadow
      // Shadow
      graphics.fillStyle(COLORS.PLATFORM_SHADOW);
      graphics.fillRoundedRect(0, 8, 200, 40, 20);
      // Top
      graphics.fillStyle(COLORS.PLATFORM);
      graphics.fillRoundedRect(0, 0, 200, 40, 20);
      
      graphics.generateTexture('platformTexture', 200, 48);
      graphics.clear();

      // Create star texture (rotated square as per mockup)
      graphics.fillStyle(COLORS.STAR);
      // A diamond shape (rotated square)
      graphics.beginPath();
      graphics.moveTo(16, 0);
      graphics.lineTo(32, 16);
      graphics.lineTo(16, 32);
      graphics.lineTo(0, 16);
      graphics.closePath();
      graphics.fill();
      
      graphics.generateTexture('starTexture', 32, 32);
      graphics.clear();

      // Create particle texture
      graphics.fillStyle(COLORS.PLAYER);
      graphics.fillCircle(4, 4, 4);
      graphics.generateTexture('particleTexture', 8, 8);
      graphics.clear();
    }

    function create(this: Phaser.Scene) {
      const { width, height } = this.scale;

      // Particles trail
      const particleManager = this.add.particles(0, 0, 'particleTexture', {
        speed: { min: 10, max: 50 },
        scale: { start: 1, end: 0 },
        alpha: { start: 0.6, end: 0 },
        lifespan: 600,
        blendMode: 'NORMAL',
        frequency: 50,
      });
      particles = particleManager;
      particles.stop();

      // Platforms
      platforms = this.physics.add.staticGroup();
      
      // Ground with theme style
      const groundHeight = 64;
      const groundGraphics = this.add.graphics();
      groundGraphics.fillStyle(COLORS.PLATFORM_SHADOW);
      groundGraphics.fillRect(0, 0, width * 2, groundHeight);
      groundGraphics.fillStyle(COLORS.PLATFORM);
      groundGraphics.fillRect(0, 8, width * 2, groundHeight - 8);
      groundGraphics.generateTexture('groundTexture', width * 2, groundHeight);
      
      const ground = this.physics.add.staticImage(width / 2, height - groundHeight / 2, 'groundTexture');
      
      // Floating platforms (styled based on mockup positions)
      platforms.create(width * 0.25, height * 0.75, 'platformTexture');
      platforms.create(width * 0.65, height * 0.55, 'platformTexture');
      platforms.create(width * 0.85, height * 0.35, 'platformTexture');
      platforms.create(width * 0.45, height * 0.20, 'platformTexture');

      // Player
      player = this.physics.add.sprite(width / 2, height - 150, 'playerTexture');
      player.setBounce(0.1);
      player.setCollideWorldBounds(true);
      player.body!.setSize(48, 48); // Match body without shadow part if possible, or just standard

      // Collisions
      this.physics.add.collider(player, ground);
      this.physics.add.collider(player, platforms);

      // Stars (Collectibles)
      stars = this.physics.add.group({
        key: 'starTexture',
        repeat: 11,
        setXY: { x: 100, y: 0, stepX: (width - 200) / 11 },
      });

      stars.getChildren().forEach((child: any) => {
        child.setBounceY(Phaser.Math.FloatBetween(0.4, 0.8));
        child.setCollideWorldBounds(true);
      });

      this.physics.add.collider(stars, ground);
      this.physics.add.collider(stars, platforms);

      this.physics.add.overlap(player, stars, (p, s) => {
        const star = s as Phaser.Physics.Arcade.Sprite;
        star.disableBody(true, true);
        
        // Update score
        setScore(prev => prev + 50);
        
        // Visual feedback
        this.tweens.add({
          targets: p,
          scaleX: 1.2,
          scaleY: 0.8,
          duration: 100,
          yoyo: true,
        });
      }, undefined, this);

      // Input
      cursors = this.input.keyboard!.createCursorKeys();
      wasdKeys = this.input.keyboard!.addKeys('W,A,S,D') as any;

      // UI (Removing old Phaser text UI as we are using React HUD)
    }

    function update(this: Phaser.Scene) {
      if ((!cursors && !wasdKeys) || !player) return;

      const speed = 250;
      const jumpForce = 500;

      const leftPressed = cursors.left.isDown || wasdKeys.A.isDown;
      const rightPressed = cursors.right.isDown || wasdKeys.D.isDown;
      const upPressed = cursors.up.isDown || wasdKeys.W.isDown || cursors.space.isDown;

      if (leftPressed) {
        player.setVelocityX(-speed);
        particles.startFollow(player, 0, 24);
        particles.start();
      } else if (rightPressed) {
        player.setVelocityX(speed);
        particles.startFollow(player, 0, 24);
        particles.start();
      } else {
        player.setVelocityX(0);
        particles.stop();
      }

      if (upPressed && player.body!.touching.down) {
        player.setVelocityY(-jumpForce);
        
        // Jump squash and stretch
        this.tweens.add({
          targets: player,
          scaleX: 0.8,
          scaleY: 1.2,
          duration: 100,
          yoyo: true,
        });
      }
    }

    return () => {
      game.destroy(true);
      gameInstanceRef.current = null;
    };
  }, []);

  return (
    <div 
      className="w-full h-screen overflow-hidden bg-[#020617] relative font-sans text-white select-none"
      id="immersive-ui-root"
    >
      {/* Game World Background Decor */}
      <div className="absolute top-20 left-10 w-48 h-48 bg-[#FF006E] rounded-full opacity-10 blur-3xl pointer-events-none"></div>
      <div className="absolute top-40 right-20 w-64 h-64 bg-[#3A86FF] rounded-full opacity-10 blur-3xl pointer-events-none"></div>

      {/* Phaser Canvas Container */}
      <div 
        ref={gameContainerRef} 
        className="absolute inset-0 z-0"
        id="phaser-canvas-container"
      />

      {/* Top HUD Overlay */}
      <div className="absolute top-0 w-full p-8 flex justify-between items-start z-20 pointer-events-none">
        <div className="flex flex-col gap-1 pointer-events-auto">
          <div className="bg-slate-900/40 backdrop-blur-xl px-6 py-3 rounded-2xl shadow-[0_0_20px_rgba(58,134,255,0.2)] border border-[#3A86FF]/30">
            <span className="text-xs uppercase tracking-widest font-bold opacity-50 text-[#3A86FF]">Score</span>
            <div className="text-2xl font-black text-white">{score.toLocaleString().padStart(6, '0')}</div>
          </div>
        </div>
        
        <div className="flex gap-4 pointer-events-auto">
          <div className="bg-slate-900/40 backdrop-blur-xl px-4 py-2 rounded-xl shadow-sm border border-[#3A86FF]/30 flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-[#FF006E] shadow-[0_0_10px_#FF006E] animate-pulse"></div>
            <span className="text-sm font-semibold opacity-80 italic">World 1-1</span>
          </div>
          <div className="w-12 h-12 bg-slate-900/40 backdrop-blur-xl rounded-xl flex items-center justify-center border border-[#3A86FF]/30 cursor-pointer hover:bg-[#3A86FF]/20 transition-all group">
            <div className="flex gap-1.5">
              <div className="w-1.5 h-5 bg-[#3A86FF] rounded-full group-hover:bg-white transition-colors"></div>
              <div className="w-1.5 h-5 bg-[#3A86FF] rounded-full group-hover:bg-white transition-colors"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Controls Guide */}
      <div className="absolute bottom-0 w-full p-12 flex justify-center items-center gap-12 z-20 bg-gradient-to-t from-[#020617] to-transparent pointer-events-none">
        <div className="flex items-center gap-4 group">
          <div className="w-12 h-12 bg-slate-900/60 backdrop-blur-sm rounded-xl shadow-lg flex items-center justify-center border border-white/10 border-b-4 border-b-[#3A86FF] font-bold text-lg text-white">A</div>
          <div className="w-12 h-12 bg-slate-900/60 backdrop-blur-sm rounded-xl shadow-lg flex items-center justify-center border border-white/10 border-b-4 border-b-[#3A86FF] font-bold text-lg text-white">D</div>
          <span className="text-xs uppercase tracking-widest font-bold opacity-40 ml-2 text-[#3A86FF]">Move</span>
        </div>
        <div className="h-8 w-px bg-white/10"></div>
        <div className="flex items-center gap-4">
          <div className="px-8 h-12 bg-slate-900/60 backdrop-blur-sm rounded-xl shadow-lg flex items-center justify-center border border-white/10 border-b-4 border-b-[#FF006E] font-bold text-sm tracking-widest uppercase text-white">Space</div>
          <span className="text-xs uppercase tracking-widest font-bold opacity-40 ml-2 text-[#FF006E]">Jump</span>
        </div>
      </div>

      {/* Aesthetic Overlay Gradients */}
      <div className="absolute inset-0 pointer-events-none ring-[48px] ring-black/40 blur-3xl opacity-50"></div>
      <div className="absolute inset-0 pointer-events-none border-[1px] border-white/5"></div>
    </div>
  );
}
