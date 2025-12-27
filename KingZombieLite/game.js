// Game Configuration
const CONFIG = {
    canvas: {
        width: 900,
        height: 600
    },
    player: {
        size: 20,
        speed: 4,
        maxHealth: 5,
        attackCooldown: 500
    },
    zombie: {
        baseSpeed: 0.4,
        baseDamage: 1,
        baseHealth: 2
    },
    maxLevel: 15
};

// Weapon Definitions
const WEAPONS = {
    'Baseball Bat': {
        name: 'Baseball Bat',
        damage: 1,
        range: 40,
        attackSpeed: 500,
        unlockLevel: 1,
        description: 'A trusty baseball bat'
    },
    'Small Gun': {
        name: 'Small Gun',
        damage: 2,
        range: 200,
        attackSpeed: 400,
        unlockLevel: 2,
        description: 'A basic pistol'
    },
    'Shotgun': {
        name: 'Shotgun',
        damage: 4,
        range: 150,
        attackSpeed: 600,
        unlockLevel: 5,
        description: 'Powerful close-range weapon'
    },
    'Assault Rifle': {
        name: 'Assault Rifle',
        damage: 3,
        range: 300,
        attackSpeed: 200,
        unlockLevel: 8,
        description: 'Fast and deadly'
    },
    'Chainsaw': {
        name: 'Chainsaw',
        damage: 5,
        range: 50,
        attackSpeed: 150,
        unlockLevel: 10,
        description: 'Brutal melee weapon'
    },
    'Bow': {
        name: 'Bow',
        damage: 3,
        range: 350,
        attackSpeed: 600,
        unlockLevel: 6,
        description: 'Silent and deadly arrows'
    },
    'Laser Gun': {
        name: 'Laser Gun',
        damage: 2,
        range: 500,
        attackSpeed: 300,
        unlockLevel: 11,
        description: 'Penetrating laser beam'
    },
    'Rocket Launcher': {
        name: 'Rocket Launcher',
        damage: 10,
        range: 400,
        attackSpeed: 1000,
        unlockLevel: 13,
        description: 'Explosive power'
    }
};

// Zombie Types
const ZOMBIE_TYPES = {
    'Normal': {
        color: '#cc3333',
        speedMultiplier: 1,
        healthMultiplier: 1,
        damageMultiplier: 1,
        scoreValue: 10
    },
    'Fast': {
        color: '#ff4444',
        speedMultiplier: 2,
        healthMultiplier: 0.7,
        damageMultiplier: 1,
        scoreValue: 15
    },
    'Tank': {
        color: '#991111',
        speedMultiplier: 0.5,
        healthMultiplier: 3,
        damageMultiplier: 2,
        scoreValue: 25
    },
    'Explosive': {
        color: '#ff6666',
        speedMultiplier: 1.5,
        healthMultiplier: 0.5,
        damageMultiplier: 3,
        scoreValue: 30,
        explodeOnDeath: true
    }
};

// Obstacle Types
const OBSTACLE_TYPES = [
    { type: 'box', color: '#8b7355', width: 40, height: 40 },
    { type: 'crate', color: '#a0826d', width: 50, height: 50 },
    { type: 'table', color: '#654321', width: 80, height: 50 },
    { type: 'wall', color: '#696969', width: 100, height: 20 },
    { type: 'cabinet', color: '#8b6914', width: 60, height: 45 }
];

// Audio System
class AudioManager {
    constructor() {
        this.sounds = {};
        this.bgMusic = null;
        this.muted = false;
    }

    playSound(type) {
        if (this.muted) return;
        
        // Create simple beep sounds using Web Audio API
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        switch(type) {
            case 'hit':
                oscillator.frequency.value = 200;
                gainNode.gain.value = 0.3;
                oscillator.start();
                oscillator.stop(audioContext.currentTime + 0.1);
                break;
            case 'kill':
                oscillator.frequency.value = 100;
                gainNode.gain.value = 0.3;
                oscillator.start();
                oscillator.stop(audioContext.currentTime + 0.2);
                break;
            case 'hurt':
                oscillator.frequency.value = 150;
                gainNode.gain.value = 0.4;
                oscillator.start();
                oscillator.stop(audioContext.currentTime + 0.15);
                break;
            case 'shoot':
                oscillator.frequency.value = 800;
                gainNode.gain.value = 0.2;
                oscillator.start();
                oscillator.stop(audioContext.currentTime + 0.05);
                break;
        }
    }
}

// Obstacle Class
class Obstacle {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.type = type.type;
        this.color = type.color;
        this.width = type.width;
        this.height = type.height;
    }

    draw(ctx) {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x - this.width / 2, this.y - this.height / 2, this.width, this.height);
        
        // Add some detail based on type
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.strokeRect(this.x - this.width / 2, this.y - this.height / 2, this.width, this.height);
        
        if (this.type === 'crate') {
            // Draw X pattern on crate
            ctx.beginPath();
            ctx.moveTo(this.x - this.width / 2, this.y - this.height / 2);
            ctx.lineTo(this.x + this.width / 2, this.y + this.height / 2);
            ctx.moveTo(this.x + this.width / 2, this.y - this.height / 2);
            ctx.lineTo(this.x - this.width / 2, this.y + this.height / 2);
            ctx.stroke();
        }
    }

    checkCollision(x, y, size) {
        return x + size > this.x - this.width / 2 &&
               x - size < this.x + this.width / 2 &&
               y + size > this.y - this.height / 2 &&
               y - size < this.y + this.height / 2;
    }
}

// HealthPotion Class
class HealthPotion {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.size = 15;
        this.bobOffset = Math.random() * Math.PI * 2;
        this.collected = false;
    }

    draw(ctx) {
        if (this.collected) return;
        
        const bobAmount = Math.sin(Date.now() / 300 + this.bobOffset) * 3;
        const drawY = this.y + bobAmount;
        
        ctx.save();
        
        // Bottle body
        ctx.fillStyle = '#ff1744';
        ctx.beginPath();
        ctx.roundRect(this.x - 8, drawY - 10, 16, 20, 3);
        ctx.fill();
        
        // Bottle neck
        ctx.fillStyle = '#c41139';
        ctx.fillRect(this.x - 5, drawY - 14, 10, 5);
        
        // Cork/cap
        ctx.fillStyle = '#8b6914';
        ctx.fillRect(this.x - 6, drawY - 16, 12, 3);
        
        // Shine effect
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.fillRect(this.x - 6, drawY - 8, 4, 8);
        
        // Heart symbol on bottle
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('♥', this.x, drawY + 3);
        
        // Glow effect
        ctx.strokeStyle = 'rgba(255, 23, 68, 0.4)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(this.x, drawY, this.size, 0, Math.PI * 2);
        ctx.stroke();
        
        ctx.restore();
    }

    checkCollision(playerX, playerY, playerSize) {
        if (this.collected) return false;
        
        const dx = playerX - this.x;
        const dy = playerY - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        return distance < this.size + playerSize;
    }
}

// TNT Block Class
class TNT {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.size = 30;
        this.exploded = false;
        this.fuseTime = 0;
        this.maxFuseTime = 90; // 1.5 seconds
        this.blinkRate = 10;
    }

    draw(ctx) {
        if (this.exploded) return;
        
        ctx.save();
        
        // TNT crate body
        ctx.fillStyle = '#8b4513';
        ctx.fillRect(this.x - this.size / 2, this.y - this.size / 2, this.size, this.size);
        
        // TNT red label
        const blinking = this.fuseTime > 0 && Math.floor(this.fuseTime / this.blinkRate) % 2 === 0;
        ctx.fillStyle = blinking ? '#ffff00' : '#ff0000';
        ctx.fillRect(this.x - this.size / 2 + 5, this.y - 5, this.size - 10, 10);
        
        // TNT text
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('TNT', this.x, this.y + 3);
        
        // Fuse on top
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(this.x, this.y - this.size / 2);
        ctx.lineTo(this.x, this.y - this.size / 2 - 8);
        ctx.stroke();
        
        // Fuse spark when lit
        if (this.fuseTime > 0) {
            const sparkSize = 3 + Math.random() * 3;
            ctx.fillStyle = '#ff6600';
            ctx.beginPath();
            ctx.arc(this.x, this.y - this.size / 2 - 8, sparkSize, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Warning glow when lit
        if (this.fuseTime > 0) {
            ctx.strokeStyle = `rgba(255, 0, 0, ${0.5 - (this.fuseTime / this.maxFuseTime) * 0.3})`;
            ctx.lineWidth = 4;
            ctx.strokeRect(this.x - this.size / 2 - 2, this.y - this.size / 2 - 2, this.size + 4, this.size + 4);
        }
        
        ctx.restore();
    }

    update() {
        if (this.fuseTime > 0) {
            this.fuseTime++;
            if (this.fuseTime >= this.maxFuseTime) {
                this.explode();
                return true; // Signal explosion
            }
        }
        return false;
    }

    ignite() {
        if (this.fuseTime === 0) {
            this.fuseTime = 1;
        }
    }

    explode() {
        this.exploded = true;
    }

    checkHit(attackX, attackY, attackRange, attackAngle) {
        if (this.exploded || this.fuseTime > 0) return false;
        
        const dx = this.x - attackX;
        const dy = this.y - attackY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const angleToTNT = Math.atan2(dy, dx);
        const angleDiff = Math.abs(angleToTNT - attackAngle);
        
        return distance <= attackRange && (angleDiff < 0.5 || angleDiff > Math.PI * 2 - 0.5);
    }
}

// Bullet Class
class Bullet {
    constructor(x, y, angle, damage, range, speed = 10) {
        this.x = x;
        this.y = y;
        this.startX = x;
        this.startY = y;
        this.angle = angle;
        this.damage = damage;
        this.range = range;
        this.speed = speed;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
        this.active = true;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        
        // Check if out of range
        const dx = this.x - this.startX;
        const dy = this.y - this.startY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > this.range || 
            this.x < 0 || this.x > CONFIG.canvas.width ||
            this.y < 0 || this.y > CONFIG.canvas.height) {
            this.active = false;
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.fillStyle = '#ffff00';
        ctx.shadowBlur = 5;
        ctx.shadowColor = '#ffaa00';
        ctx.beginPath();
        ctx.arc(this.x, this.y, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    checkCollision(x, y, size) {
        const dx = this.x - x;
        const dy = this.y - y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance < size;
    }
}

// Arrow Class
class Arrow {
    constructor(x, y, angle, damage, range, speed = 8) {
        this.x = x;
        this.y = y;
        this.startX = x;
        this.startY = y;
        this.angle = angle;
        this.damage = damage;
        this.range = range;
        this.speed = speed;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
        this.active = true;
        this.trail = [];
    }

    update() {
        this.trail.push({ x: this.x, y: this.y, life: 10 });
        if (this.trail.length > 5) this.trail.shift();
        
        this.x += this.vx;
        this.y += this.vy;
        
        // Check if out of range
        const dx = this.x - this.startX;
        const dy = this.y - this.startY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > this.range || 
            this.x < 0 || this.x > CONFIG.canvas.width ||
            this.y < 0 || this.y > CONFIG.canvas.height) {
            this.active = false;
        }
    }

    draw(ctx) {
        ctx.save();
        
        // Draw trail
        this.trail.forEach((point, i) => {
            ctx.fillStyle = `rgba(139, 69, 19, ${i / this.trail.length * 0.5})`;
            ctx.fillRect(point.x - 1, point.y - 1, 2, 2);
        });
        
        // Draw arrow
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        
        // Arrow shaft
        ctx.fillStyle = '#8b4513';
        ctx.fillRect(-8, -1, 16, 2);
        
        // Arrow head
        ctx.fillStyle = '#666';
        ctx.beginPath();
        ctx.moveTo(8, 0);
        ctx.lineTo(3, -4);
        ctx.lineTo(3, 4);
        ctx.closePath();
        ctx.fill();
        
        // Fletching
        ctx.fillStyle = '#ff4444';
        ctx.beginPath();
        ctx.moveTo(-8, 0);
        ctx.lineTo(-12, -3);
        ctx.lineTo(-12, 3);
        ctx.closePath();
        ctx.fill();
        
        ctx.restore();
    }

    checkCollision(x, y, size) {
        const dx = this.x - x;
        const dy = this.y - y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance < size;
    }
}

// Laser Beam Class
class LaserBeam {
    constructor(x, y, angle, range, damage) {
        this.x = x;
        this.y = y;
        this.angle = angle;
        this.range = range;
        this.damage = damage;
        this.life = 8; // Frames to display
        this.endX = x + Math.cos(angle) * range;
        this.endY = y + Math.sin(angle) * range;
    }

    update() {
        this.life--;
    }

    draw(ctx) {
        if (this.life <= 0) return;
        
        const alpha = this.life / 8;
        
        ctx.save();
        
        // Outer glow
        ctx.strokeStyle = `rgba(0, 255, 255, ${alpha * 0.3})`;
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(this.endX, this.endY);
        ctx.stroke();
        
        // Middle beam
        ctx.strokeStyle = `rgba(0, 255, 255, ${alpha * 0.6})`;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(this.endX, this.endY);
        ctx.stroke();
        
        // Core beam
        ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(this.endX, this.endY);
        ctx.stroke();
        
        ctx.restore();
    }

    isActive() {
        return this.life > 0;
    }
}

// Player Class
class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.size = CONFIG.player.size;
        this.speed = CONFIG.player.speed;
        this.health = CONFIG.player.maxHealth;
        this.maxHealth = CONFIG.player.maxHealth;
        this.score = 0;
        this.currentWeapon = WEAPONS['Baseball Bat'];
        this.unlockedWeapons = ['Baseball Bat'];
        this.lastAttack = 0;
        this.angle = 0;
        this.iframes = 0; // Invincibility frames
        this.attackAnimationTime = 0; // For melee swing animation
    }

    move(keys, obstacles) {
        const oldX = this.x;
        const oldY = this.y;
        
        if (keys['w'] || keys['W'] || keys['ArrowUp']) this.y -= this.speed;
        if (keys['s'] || keys['S'] || keys['ArrowDown']) this.y += this.speed;
        if (keys['a'] || keys['A'] || keys['ArrowLeft']) this.x -= this.speed;
        if (keys['d'] || keys['D'] || keys['ArrowRight']) this.x += this.speed;

        // Check obstacle collisions
        for (const obstacle of obstacles) {
            if (obstacle.checkCollision(this.x, this.y, this.size)) {
                this.x = oldX;
                this.y = oldY;
                break;
            }
        }

        // Keep player in bounds
        this.x = Math.max(this.size, Math.min(CONFIG.canvas.width - this.size, this.x));
        this.y = Math.max(this.size, Math.min(CONFIG.canvas.height - this.size, this.y));
    }

    updateAngle(mouseX, mouseY) {
        this.angle = Math.atan2(mouseY - this.y, mouseX - this.x);
    }

    attack(currentTime) {
        if (currentTime - this.lastAttack < this.currentWeapon.attackSpeed) {
            return null;
        }
        this.lastAttack = currentTime;
        this.attackAnimationTime = 15; // Animation duration
        
        return {
            x: this.x,
            y: this.y,
            angle: this.angle,
            range: this.currentWeapon.range,
            damage: this.currentWeapon.damage,
            weaponName: this.currentWeapon.name
        };
    }

    takeDamage(amount) {
        if (this.iframes > 0) return false;
        
        this.health -= amount;
        this.iframes = 60; // 1 second of invincibility
        return this.health <= 0;
    }

    update() {
        if (this.iframes > 0) this.iframes--;
        if (this.attackAnimationTime > 0) this.attackAnimationTime--;
    }

    draw(ctx) {
        const weapon = this.currentWeapon;
        const isRanged = weapon.range > 100;
        
        ctx.save();
        ctx.translate(this.x, this.y);
        
        // Draw player body
        ctx.fillStyle = this.iframes > 0 && Math.floor(this.iframes / 5) % 2 === 0 ? '#ff6b6b' : '#4ecca3';
        ctx.beginPath();
        ctx.arc(0, 0, this.size / 2, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw eyes
        ctx.fillStyle = '#000';
        ctx.fillRect(-5, -5, 3, 3);
        ctx.fillRect(2, -5, 3, 3);
        
        // Rotate for weapon
        ctx.rotate(this.angle);
        
        // Draw weapon based on type
        if (weapon.name === 'Baseball Bat') {
            ctx.strokeStyle = '#8b6914';
            ctx.lineWidth = 6;
            ctx.lineCap = 'round';
            
            if (this.attackAnimationTime > 0) {
                const swingAngle = (this.attackAnimationTime / 15) * Math.PI / 3;
                ctx.rotate(-Math.PI / 4 + swingAngle);
            }
            
            ctx.beginPath();
            ctx.moveTo(this.size / 2, 0);
            ctx.lineTo(this.size / 2 + 25, 0);
            ctx.stroke();
            
            // Bat end
            ctx.fillStyle = '#654321';
            ctx.beginPath();
            ctx.arc(this.size / 2 + 25, 0, 4, 0, Math.PI * 2);
            ctx.fill();
            
        } else if (weapon.name === 'Bow') {
            // Bow weapon
            const drawTension = this.attackAnimationTime > 12;
            
            // Bow body
            ctx.strokeStyle = '#654321';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(this.size / 2 + 5, -15);
            ctx.quadraticCurveTo(this.size / 2 + 20, 0, this.size / 2 + 5, 15);
            ctx.stroke();
            
            // Bow string
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(this.size / 2 + 5, -15);
            if (drawTension) {
                ctx.lineTo(this.size / 2 - 5, 0); // Pulled back
            } else {
                ctx.lineTo(this.size / 2 + 3, 0);
            }
            ctx.lineTo(this.size / 2 + 5, 15);
            ctx.stroke();
            
            // Arrow when drawn
            if (drawTension) {
                ctx.strokeStyle = '#8b4513';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(this.size / 2 - 5, 0);
                ctx.lineTo(this.size / 2 + 15, 0);
                ctx.stroke();
            }
            
        } else if (weapon.name === 'Laser Gun') {
            // Laser gun
            ctx.fillStyle = '#00cccc';
            ctx.fillRect(this.size / 2, -6, 28, 12);
            
            // Laser barrel
            ctx.fillStyle = '#0099ff';
            ctx.fillRect(this.size / 2 + 23, -4, 8, 8);
            
            // Energy core
            ctx.fillStyle = '#00ffff';
            ctx.fillRect(this.size / 2 + 8, -3, 6, 6);
            
            // Laser effect when firing
            if (this.attackAnimationTime > 10) {
                ctx.strokeStyle = '#00ffff';
                ctx.lineWidth = 3;
                ctx.shadowBlur = 15;
                ctx.shadowColor = '#00ffff';
                ctx.beginPath();
                ctx.moveTo(this.size / 2 + 31, 0);
                ctx.lineTo(this.size / 2 + 100, 0);
                ctx.stroke();
                ctx.shadowBlur = 0;
            }
            
        } else if (weapon.name === 'Chainsaw') {
            if (this.attackAnimationTime > 0) {
                const swingAngle = (this.attackAnimationTime / 15) * Math.PI / 2;
                ctx.rotate(-Math.PI / 3 + swingAngle);
            }
            
            if (weapon.name === 'Katana') {
                // Katana blade
                ctx.fillStyle = '#c0c0c0';
                ctx.fillRect(this.size / 2, -3, 30, 6);
                
                // Sharp edge
                ctx.fillStyle = '#fff';
                ctx.fillRect(this.size / 2, -2, 30, 1);
                
                // Handle
                ctx.fillStyle = '#000';
                ctx.fillRect(this.size / 2 - 5, -4, 8, 8);
            } else {
                // Chainsaw
                ctx.fillStyle = '#ff4444';
                ctx.fillRect(this.size / 2 - 5, -6, 10, 12);
                
                ctx.fillStyle = '#666';
                ctx.fillRect(this.size / 2 + 5, -4, 20, 8);
                
                // Teeth
                if (this.attackAnimationTime > 0) {
                    ctx.fillStyle = '#fff';
                    for (let i = 0; i < 5; i++) {
                        ctx.fillRect(this.size / 2 + 7 + i * 4, -5, 2, 2);
                        ctx.fillRect(this.size / 2 + 7 + i * 4, 3, 2, 2);
                    }
                }
            }
            
        } else if (isRanged) {
            // Draw guns
            const gunLength = weapon.name === 'Rocket Launcher' ? 35 : 
                            weapon.name === 'Assault Rifle' ? 30 : 
                            weapon.name === 'Shotgun' ? 28 : 20;
            const gunWidth = weapon.name === 'Rocket Launcher' ? 10 : 6;
            
            // Gun body
            ctx.fillStyle = weapon.name === 'Rocket Launcher' ? '#8b4513' : '#333';
            ctx.fillRect(this.size / 2, -gunWidth / 2, gunLength, gunWidth);
            
            // Gun barrel
            ctx.fillStyle = '#000';
            ctx.fillRect(this.size / 2 + gunLength - 3, -gunWidth / 2 + 1, 5, gunWidth - 2);
            
            // Gun handle
            ctx.fillStyle = '#654321';
            ctx.fillRect(this.size / 2 + 5, gunWidth / 2 - 2, 6, 8);
            
            // Muzzle flash when attacking
            if (this.attackAnimationTime > 12) {
                ctx.fillStyle = '#ffff00';
                ctx.shadowBlur = 10;
                ctx.shadowColor = '#ff6600';
                ctx.beginPath();
                ctx.arc(this.size / 2 + gunLength + 5, 0, 5, 0, Math.PI * 2);
                ctx.fill();
                ctx.shadowBlur = 0;
            }
        }
        
        ctx.restore();
    }

    switchWeapon() {
        const currentIndex = this.unlockedWeapons.indexOf(this.currentWeapon.name);
        const nextIndex = (currentIndex + 1) % this.unlockedWeapons.length;
        this.currentWeapon = WEAPONS[this.unlockedWeapons[nextIndex]];
    }

    unlockWeapon(weaponName) {
        if (!this.unlockedWeapons.includes(weaponName)) {
            this.unlockedWeapons.push(weaponName);
        }
    }
}

// Zombie Class
class Zombie {
    constructor(x, y, level, type = 'Normal') {
        this.x = x;
        this.y = y;
        this.size = 18;
        this.type = type;
        this.typeData = ZOMBIE_TYPES[type];
        
        const levelMultiplier = 1 + (level - 1) * 0.1; // Reduced from 0.2 to 0.1
        this.speed = CONFIG.zombie.baseSpeed * this.typeData.speedMultiplier * levelMultiplier;
        this.health = CONFIG.zombie.baseHealth * this.typeData.healthMultiplier * levelMultiplier;
        this.maxHealth = this.health;
        this.damage = CONFIG.zombie.baseDamage * this.typeData.damageMultiplier;
        this.attackCooldown = 0;
    }

    update(playerX, playerY, obstacles) {
        const dx = playerX - this.x;
        const dy = playerY - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > 0) {
            const oldX = this.x;
            const oldY = this.y;
            const moveX = (dx / distance) * this.speed;
            const moveY = (dy / distance) * this.speed;
            
            this.x += moveX;
            this.y += moveY;
            
            let isBlocked = false;
            let blockingObstacle = null;
            
            // Check obstacle collisions
            for (const obstacle of obstacles) {
                if (obstacle.checkCollision(this.x, this.y, this.size)) {
                    isBlocked = true;
                    blockingObstacle = obstacle;
                    break;
                }
            }
            
            if (isBlocked && blockingObstacle) {
                // Revert movement
                this.x = oldX;
                this.y = oldY;
                
                // Calculate vector from obstacle center to zombie
                const obstacleToZombie = {
                    x: this.x - blockingObstacle.x,
                    y: this.y - blockingObstacle.y
                };
                
                // Try moving around the obstacle
                // Determine if we should go left or right around the obstacle
                const crossProduct = moveX * obstacleToZombie.y - moveY * obstacleToZombie.x;
                const perpAngle = Math.atan2(dy, dx) + (crossProduct > 0 ? Math.PI / 2 : -Math.PI / 2);
                
                // Try perpendicular movement
                const tryX = this.x + Math.cos(perpAngle) * this.speed;
                const tryY = this.y + Math.sin(perpAngle) * this.speed;
                
                let canMovePerpendicular = true;
                for (const obstacle of obstacles) {
                    if (obstacle.checkCollision(tryX, tryY, this.size)) {
                        canMovePerpendicular = false;
                        break;
                    }
                }
                
                if (canMovePerpendicular) {
                    this.x = tryX;
                    this.y = tryY;
                } else {
                    // Try opposite perpendicular direction
                    const oppPerpAngle = perpAngle + Math.PI;
                    const tryX2 = this.x + Math.cos(oppPerpAngle) * this.speed * 0.7;
                    const tryY2 = this.y + Math.sin(oppPerpAngle) * this.speed * 0.7;
                    
                    let canMoveOppPerp = true;
                    for (const obstacle of obstacles) {
                        if (obstacle.checkCollision(tryX2, tryY2, this.size)) {
                            canMoveOppPerp = false;
                            break;
                        }
                    }
                    
                    if (canMoveOppPerp) {
                        this.x = tryX2;
                        this.y = tryY2;
                    }
                }
            }
        }

        if (this.attackCooldown > 0) this.attackCooldown--;
    }

    draw(ctx) {
        ctx.save();
        
        // Draw irregular blob body
        ctx.fillStyle = this.typeData.color;
        ctx.beginPath();
        
        // Create irregular blob shape
        const segments = 8;
        for (let i = 0; i < segments; i++) {
            const angle = (i / segments) * Math.PI * 2;
            const radius = this.size / 2 + Math.sin(Date.now() / 200 + i) * 3;
            const x = this.x + Math.cos(angle) * radius;
            const y = this.y + Math.sin(angle) * radius;
            
            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        ctx.closePath();
        ctx.fill();
        
        // Draw left hand
        ctx.fillStyle = this.typeData.color;
        ctx.beginPath();
        ctx.ellipse(this.x - this.size / 2 - 8, this.y, 6, 10, -Math.PI / 6, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw right hand
        ctx.beginPath();
        ctx.ellipse(this.x + this.size / 2 + 8, this.y, 6, 10, Math.PI / 6, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw fingers on left hand
        ctx.fillRect(this.x - this.size / 2 - 12, this.y - 8, 3, 6);
        ctx.fillRect(this.x - this.size / 2 - 12, this.y + 2, 3, 6);
        
        // Draw fingers on right hand
        ctx.fillRect(this.x + this.size / 2 + 9, this.y - 8, 3, 6);
        ctx.fillRect(this.x + this.size / 2 + 9, this.y + 2, 3, 6);
        
        // Draw eyes
        ctx.fillStyle = '#000';
        ctx.fillRect(this.x - 5, this.y - 3, 3, 3);
        ctx.fillRect(this.x + 2, this.y - 3, 3, 3);
        
        ctx.restore();
        
        // Health bar
        if (this.health < this.maxHealth) {
            const barWidth = this.size;
            const barHeight = 4;
            ctx.fillStyle = '#333';
            ctx.fillRect(this.x - barWidth / 2, this.y - this.size / 2 - 8, barWidth, barHeight);
            ctx.fillStyle = '#4ecca3';
            ctx.fillRect(this.x - barWidth / 2, this.y - this.size / 2 - 8, 
                        barWidth * (this.health / this.maxHealth), barHeight);
        }
    }

    canAttack() {
        return this.attackCooldown === 0;
    }

    attack() {
        this.attackCooldown = 60; // 1 second cooldown
        return this.damage;
    }
}

// King Zombie Boss
class KingZombie extends Zombie {
    constructor(x, y) {
        super(x, y, 15, 'Tank');
        this.size = 40;
        this.health = 100;
        this.maxHealth = 100;
        this.damage = 3;
        this.speed = 2;
        this.typeData = { ...this.typeData, color: '#8b0000' };
    }

    draw(ctx) {
        // Crown
        ctx.fillStyle = '#ffd700';
        ctx.fillRect(this.x - 20, this.y - 30, 40, 10);
        ctx.fillRect(this.x - 15, this.y - 40, 10, 10);
        ctx.fillRect(this.x - 5, this.y - 45, 10, 15);
        ctx.fillRect(this.x + 5, this.y - 40, 10, 10);
        
        // Body
        ctx.fillStyle = this.typeData.color;
        ctx.fillRect(this.x - this.size / 2, this.y - this.size / 2, this.size, this.size);
        
        // Eyes
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(this.x - 10, this.y - 5, 8, 8);
        ctx.fillRect(this.x + 2, this.y - 5, 8, 8);
        
        // Health bar
        const barWidth = this.size * 2;
        const barHeight = 6;
        ctx.fillStyle = '#333';
        ctx.fillRect(this.x - barWidth / 2, this.y - this.size / 2 - 15, barWidth, barHeight);
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(this.x - barWidth / 2, this.y - this.size / 2 - 15, 
                    barWidth * (this.health / this.maxHealth), barHeight);
        
        // King label
        ctx.fillStyle = '#fff';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('KING ZOMBIE', this.x, this.y - this.size / 2 - 20);
    }
}

// Game Class
class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.audioManager = new AudioManager();
        
        this.keys = {};
        this.mouseX = 0;
        this.mouseY = 0;
        this.mouseDown = false;
        this.spaceDown = false;
        
        this.player = null;
        this.zombies = [];
        this.obstacles = [];
        this.healthPotions = [];
        this.tntBlocks = [];
        this.particles = [];
        this.bullets = [];
        this.arrows = [];
        this.lasers = [];
        this.currentLevel = 1;
        this.gameState = 'start'; // start, playing, elevator, gameover, victory
        this.isPaused = false;
        this.controlType = 'keyboard'; // keyboard or touch
        this.joystick = { active: false, startX: 0, startY: 0, currentX: 0, currentY: 0 };
        this.potionRespawnTimer = 0;
        this.potionRespawnInterval = 600; // 10 seconds
        
        this.setupEventListeners();
        this.updateUI();
    }

    setupEventListeners() {
        // Keyboard
        window.addEventListener('keydown', (e) => {
            this.keys[e.key] = true;
            if (e.key === 'e' || e.key === 'E') {
                if (this.gameState === 'playing' && this.player) {
                    this.player.switchWeapon();
                    this.updateUI();
                }
            }
            if (e.key === ' ' || e.key === 'Spacebar') {
                this.spaceDown = true;
                e.preventDefault(); // Prevent page scroll
            }
            // Pause with Ctrl+P or P
            if ((e.ctrlKey && e.key === 'p') || e.key === 'P') {
                e.preventDefault();
                if (this.gameState === 'playing') {
                    this.togglePause();
                }
            }
            // Open weapon menu with V key
            if (e.key === 'v' || e.key === 'V') {
                if (this.gameState === 'playing' && !this.isPaused) {
                    this.openWeaponMenu();
                }
            }
            // Cheat code: Ctrl+Shift+F to jump to final level with all weapons
            if (e.ctrlKey && e.shiftKey && (e.key === 'f' || e.key === 'F')) {
                e.preventDefault();
                if (this.gameState === 'playing' && this.player) {
                    this.activateCheatCode();
                }
            }
        });
        
        window.addEventListener('keyup', (e) => {
            this.keys[e.key] = false;
            if (e.key === ' ' || e.key === 'Spacebar') {
                this.spaceDown = false;
            }
        });
        
        // Mouse
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            this.mouseX = e.clientX - rect.left;
            this.mouseY = e.clientY - rect.top;
        });
        
        this.canvas.addEventListener('mousedown', () => {
            this.mouseDown = true;
        });
        
        this.canvas.addEventListener('mouseup', () => {
            this.mouseDown = false;
        });
        
        // Buttons
        document.getElementById('start-btn').addEventListener('click', () => this.startGame());
        document.getElementById('keyboard-btn').addEventListener('click', () => this.selectControlType('keyboard'));
        document.getElementById('touch-btn').addEventListener('click', () => this.selectControlType('touch'));
        document.getElementById('continue-btn').addEventListener('click', () => this.continueToNextLevel());
        document.getElementById('restart-btn').addEventListener('click', () => this.startGame());
        document.getElementById('play-again-btn').addEventListener('click', () => this.startGame());
        document.getElementById('pause-btn').addEventListener('click', () => this.togglePause());
        document.getElementById('resume-btn').addEventListener('click', () => this.togglePause());
        document.getElementById('weapon-menu-btn').addEventListener('click', () => this.openWeaponMenu());
        document.getElementById('close-weapon-menu-btn').addEventListener('click', () => this.closeWeaponMenu());
        
        // Touch controls
        this.setupTouchControls();
    }

    selectControlType(type) {
        this.controlType = type;
        document.querySelectorAll('.control-btn').forEach(btn => btn.classList.remove('selected-control'));
        if (type === 'keyboard') {
            document.getElementById('keyboard-btn').classList.add('selected-control');
        } else {
            document.getElementById('touch-btn').classList.add('selected-control');
        }
    }

    setupTouchControls() {
        const joystickBase = document.getElementById('joystick-base');
        const joystickStick = document.getElementById('joystick-stick');
        const attackButton = document.getElementById('attack-button');
        
        // Joystick touch events
        joystickBase.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            const rect = joystickBase.getBoundingClientRect();
            this.joystick.active = true;
            this.joystick.startX = rect.left + rect.width / 2;
            this.joystick.startY = rect.top + rect.height / 2;
            this.updateJoystick(touch.clientX, touch.clientY, joystickStick);
        });
        
        joystickBase.addEventListener('touchmove', (e) => {
            e.preventDefault();
            if (this.joystick.active) {
                const touch = e.touches[0];
                this.updateJoystick(touch.clientX, touch.clientY, joystickStick);
            }
        });
        
        joystickBase.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.joystick.active = false;
            joystickStick.style.transform = 'translate(-50%, -50%)';
        });
        
        // Attack button
        attackButton.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.spaceDown = true;
        });
        
        attackButton.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.spaceDown = false;
        });
        
        // Canvas touch for aiming
        this.canvas.addEventListener('touchmove', (e) => {
            if (this.controlType === 'touch' && this.gameState === 'playing') {
                const touch = e.touches[0];
                const rect = this.canvas.getBoundingClientRect();
                this.mouseX = touch.clientX - rect.left;
                this.mouseY = touch.clientY - rect.top;
            }
        });
    }

    updateJoystick(touchX, touchY, stick) {
        const deltaX = touchX - this.joystick.startX;
        const deltaY = touchY - this.joystick.startY;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        const maxDistance = 40;
        
        if (distance > maxDistance) {
            const angle = Math.atan2(deltaY, deltaX);
            this.joystick.currentX = Math.cos(angle) * maxDistance;
            this.joystick.currentY = Math.sin(angle) * maxDistance;
        } else {
            this.joystick.currentX = deltaX;
            this.joystick.currentY = deltaY;
        }
        
        stick.style.transform = `translate(calc(-50% + ${this.joystick.currentX}px), calc(-50% + ${this.joystick.currentY}px))`;
    }

    startGame() {
        this.currentLevel = 1;
        this.player = new Player(CONFIG.canvas.width / 2, CONFIG.canvas.height / 2);
        this.zombies = [];
        this.obstacles = [];
        this.healthPotions = [];
        this.tntBlocks = [];
        this.particles = [];
        this.bullets = [];
        this.arrows = [];
        this.lasers = [];
        this.gameState = 'playing';
        this.potionRespawnTimer = 0;
        
        // Show/hide touch controls based on control type
        if (this.controlType === 'touch') {
            document.getElementById('touch-controls').classList.remove('hidden');
        } else {
            document.getElementById('touch-controls').classList.add('hidden');
        }
        
        this.hideAllScreens();
        this.spawnZombies();
        this.updateUI();
        this.gameLoop();
    }

    spawnZombies() {
        this.zombies = [];
        this.obstacles = [];
        this.healthPotions = [];
        this.tntBlocks = [];
        this.potionRespawnTimer = 0;
        
        // Spawn TNT blocks (starting from level 5)
        if (this.currentLevel >= 5) {
            const tntCount = 2 + Math.floor((this.currentLevel - 5) / 3);
            for (let i = 0; i < tntCount; i++) {
                let x, y, validPosition;
                let attempts = 0;
                
                do {
                    validPosition = true;
                    x = 80 + Math.random() * (CONFIG.canvas.width - 160);
                    y = 80 + Math.random() * (CONFIG.canvas.height - 160);
                    
                    // Don't spawn near player
                    if (Math.hypot(x - this.player.x, y - this.player.y) < 150) {
                        validPosition = false;
                    }
                    
                    // Don't spawn too close to other TNT
                    for (const tnt of this.tntBlocks) {
                        if (Math.hypot(x - tnt.x, y - tnt.y) < 120) {
                            validPosition = false;
                            break;
                        }
                    }
                    
                    attempts++;
                } while (!validPosition && attempts < 50);
                
                if (validPosition) {
                    this.tntBlocks.push(new TNT(x, y));
                }
            }
        }
        
        // Spawn health potions (1-3 per level)
        const potionCount = 1 + Math.floor(Math.random() * 3);
        for (let i = 0; i < potionCount; i++) {
            let x, y, validPosition;
            let attempts = 0;
            
            do {
                validPosition = true;
                x = 50 + Math.random() * (CONFIG.canvas.width - 100);
                y = 50 + Math.random() * (CONFIG.canvas.height - 100);
                
                // Don't spawn near player
                if (Math.hypot(x - this.player.x, y - this.player.y) < 100) {
                    validPosition = false;
                }
                
                attempts++;
            } while (!validPosition && attempts < 50);
            
            if (validPosition) {
                this.healthPotions.push(new HealthPotion(x, y));
            }
        }
        
        // Spawn obstacles
        const obstacleCount = 4 + Math.floor(this.currentLevel / 2);
        for (let i = 0; i < obstacleCount; i++) {
            let x, y, validPosition;
            let attempts = 0;
            
            do {
                validPosition = true;
                x = 50 + Math.random() * (CONFIG.canvas.width - 100);
                y = 50 + Math.random() * (CONFIG.canvas.height - 100);
                
                // Don't spawn near player start position
                if (Math.hypot(x - this.player.x, y - this.player.y) < 150) {
                    validPosition = false;
                }
                
                // Don't spawn too close to other obstacles
                for (const obstacle of this.obstacles) {
                    if (Math.hypot(x - obstacle.x, y - obstacle.y) < 100) {
                        validPosition = false;
                        break;
                    }
                }
                
                attempts++;
            } while (!validPosition && attempts < 50);
            
            if (validPosition) {
                const obstacleType = OBSTACLE_TYPES[Math.floor(Math.random() * OBSTACLE_TYPES.length)];
                this.obstacles.push(new Obstacle(x, y, obstacleType));
            }
        }
        
        const baseCount = 3 + this.currentLevel * 2;
        
        for (let i = 0; i < baseCount; i++) {
            let x, y, validPosition;
            // Spawn zombies away from player and obstacles
            do {
                validPosition = true;
                x = Math.random() * CONFIG.canvas.width;
                y = Math.random() * CONFIG.canvas.height;
                
                // Check player distance
                if (Math.hypot(x - this.player.x, y - this.player.y) < 150) {
                    validPosition = false;
                }
                
                // Check obstacles
                for (const obstacle of this.obstacles) {
                    if (obstacle.checkCollision(x, y, 20)) {
                        validPosition = false;
                        break;
                    }
                }
            } while (!validPosition);
            
            // Determine zombie type based on level
            let type = 'Normal';
            if (this.currentLevel >= 3) {
                const rand = Math.random();
                if (rand < 0.15) type = 'Fast';
                else if (rand < 0.25 && this.currentLevel >= 5) type = 'Tank';
                else if (rand < 0.35 && this.currentLevel >= 8) type = 'Explosive';
            }
            
            this.zombies.push(new Zombie(x, y, this.currentLevel, type));
        }
        
        // Spawn King Zombie on level 15
        if (this.currentLevel === 15) {
            this.zombies.push(new KingZombie(CONFIG.canvas.width / 2, 100));
        }
    }

    gameLoop() {
        if (this.gameState !== 'playing' || this.isPaused) {
            if (this.isPaused) {
                requestAnimationFrame(() => this.gameLoop());
            }
            return;
        }
        
        this.update();
        this.draw();
        
        requestAnimationFrame(() => this.gameLoop());
    }

    update() {
        if (!this.player) return;
        
        // Handle touch controls
        if (this.controlType === 'touch' && this.joystick.active) {
            const moveSpeed = this.player.speed;
            const normalizedX = this.joystick.currentX / 40; // 40 is max distance
            const normalizedY = this.joystick.currentY / 40;
            
            const oldX = this.player.x;
            const oldY = this.player.y;
            
            this.player.x += normalizedX * moveSpeed;
            this.player.y += normalizedY * moveSpeed;
            
            // Check obstacle collisions
            for (const obstacle of this.obstacles) {
                if (obstacle.checkCollision(this.player.x, this.player.y, this.player.size)) {
                    this.player.x = oldX;
                    this.player.y = oldY;
                    break;
                }
            }
            
            // Keep player in bounds
            this.player.x = Math.max(this.player.size, Math.min(CONFIG.canvas.width - this.player.size, this.player.x));
            this.player.y = Math.max(this.player.size, Math.min(CONFIG.canvas.height - this.player.size, this.player.y));
        } else {
            // Update player with keyboard
            this.player.move(this.keys, this.obstacles);
        }
        
        this.player.updateAngle(this.mouseX, this.mouseY);
        this.player.update();
        
        // Health potion respawn timer
        this.potionRespawnTimer++;
        if (this.potionRespawnTimer >= this.potionRespawnInterval && this.healthPotions.length < 5) {
            this.potionRespawnTimer = 0;
            // Spawn a new health potion
            let x, y, validPosition;
            let attempts = 0;
            
            do {
                validPosition = true;
                x = 50 + Math.random() * (CONFIG.canvas.width - 100);
                y = 50 + Math.random() * (CONFIG.canvas.height - 100);
                
                // Don't spawn near player
                if (Math.hypot(x - this.player.x, y - this.player.y) < 100) {
                    validPosition = false;
                }
                
                // Don't spawn on obstacles
                for (const obstacle of this.obstacles) {
                    if (obstacle.checkCollision(x, y, 15)) {
                        validPosition = false;
                        break;
                    }
                }
                
                attempts++;
            } while (!validPosition && attempts < 30);
            
            if (validPosition) {
                this.healthPotions.push(new HealthPotion(x, y));
            }
        }
        
        // Update TNT blocks
        for (let i = this.tntBlocks.length - 1; i >= 0; i--) {
            const tnt = this.tntBlocks[i];
            if (tnt.update()) {
                // TNT exploded
                this.handleTNTExplosion(tnt.x, tnt.y);
                this.tntBlocks.splice(i, 1);
            }
        }
        
        // Update bullets
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const bullet = this.bullets[i];
            bullet.update();
            
            if (!bullet.active) {
                this.bullets.splice(i, 1);
                continue;
            }
            
            // Check bullet collision with zombies
            for (let j = this.zombies.length - 1; j >= 0; j--) {
                const zombie = this.zombies[j];
                if (bullet.checkCollision(zombie.x, zombie.y, zombie.size)) {
                    zombie.health -= bullet.damage;
                    this.createBloodEffect(zombie.x, zombie.y);
                    
                    if (zombie.health <= 0) {
                        this.audioManager.playSound('kill');
                        this.player.score += zombie.typeData.scoreValue;
                        
                        // Death particles
                        for (let k = 0; k < 8; k++) {
                            this.particles.push({
                                x: zombie.x,
                                y: zombie.y,
                                vx: (Math.random() - 0.5) * 4,
                                vy: (Math.random() - 0.5) * 4,
                                life: 30,
                                color: zombie.typeData.color
                            });
                        }
                        
                        if (zombie.typeData.explodeOnDeath) {
                            this.handleExplosion(zombie.x, zombie.y);
                        }
                        
                        this.zombies.splice(j, 1);
                        this.updateUI();
                    }
                    
                    bullet.active = false;
                    break;
                }
            }
            
            // Check bullet collision with obstacles
            for (const obstacle of this.obstacles) {
                if (obstacle.checkCollision(bullet.x, bullet.y, 3)) {
                    bullet.active = false;
                    break;
                }
            }
        }
        
        // Update arrows
        for (let i = this.arrows.length - 1; i >= 0; i--) {
            const arrow = this.arrows[i];
            arrow.update();
            
            if (!arrow.active) {
                this.arrows.splice(i, 1);
                continue;
            }
            
            // Check arrow collision with zombies
            for (let j = this.zombies.length - 1; j >= 0; j--) {
                const zombie = this.zombies[j];
                if (arrow.checkCollision(zombie.x, zombie.y, zombie.size)) {
                    zombie.health -= arrow.damage;
                    this.createBloodEffect(zombie.x, zombie.y);
                    
                    if (zombie.health <= 0) {
                        this.audioManager.playSound('kill');
                        this.player.score += zombie.typeData.scoreValue;
                        
                        // Death particles
                        for (let k = 0; k < 8; k++) {
                            this.particles.push({
                                x: zombie.x,
                                y: zombie.y,
                                vx: (Math.random() - 0.5) * 4,
                                vy: (Math.random() - 0.5) * 4,
                                life: 30,
                                color: zombie.typeData.color
                            });
                        }
                        
                        if (zombie.typeData.explodeOnDeath) {
                            this.handleExplosion(zombie.x, zombie.y);
                        }
                        
                        this.zombies.splice(j, 1);
                        this.updateUI();
                    }
                    
                    arrow.active = false;
                    break;
                }
            }
            
            // Check arrow collision with obstacles
            for (const obstacle of this.obstacles) {
                if (obstacle.checkCollision(arrow.x, arrow.y, 3)) {
                    arrow.active = false;
                    break;
                }
            }
        }
        
        // Update lasers
        for (let i = this.lasers.length - 1; i >= 0; i--) {
            const laser = this.lasers[i];
            laser.update();
            
            if (!laser.isActive()) {
                this.lasers.splice(i, 1);
            }
        }
        
        // Check health potion collection
        for (let i = this.healthPotions.length - 1; i >= 0; i--) {
            const potion = this.healthPotions[i];
            if (potion.checkCollision(this.player.x, this.player.y, this.player.size)) {
                if (this.player.health < this.player.maxHealth) {
                    this.player.health = Math.min(this.player.health + 1, this.player.maxHealth);
                    this.audioManager.playSound('hit');
                    
                    // Create sparkle particles
                    for (let j = 0; j < 12; j++) {
                        this.particles.push({
                            x: potion.x,
                            y: potion.y,
                            vx: (Math.random() - 0.5) * 6,
                            vy: (Math.random() - 0.5) * 6,
                            life: 40,
                            color: '#ff1744'
                        });
                    }
                }
                this.healthPotions.splice(i, 1);
                this.updateUI();
            }
        }
        
        // Handle attacks
        if (this.mouseDown || this.spaceDown) {
            const attack = this.player.attack(Date.now());
            if (attack) {
                this.handlePlayerAttack(attack);
            }
        }
        
        // Update zombies
        for (let i = this.zombies.length - 1; i >= 0; i--) {
            const zombie = this.zombies[i];
            zombie.update(this.player.x, this.player.y, this.obstacles);
            
            // Check collision with player
            const dx = zombie.x - this.player.x;
            const dy = zombie.y - this.player.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < this.player.size + zombie.size && zombie.canAttack()) {
                const damage = zombie.attack();
                const isDead = this.player.takeDamage(damage);
                this.audioManager.playSound('hurt');
                this.updateUI();
                
                if (isDead) {
                    this.gameOver();
                    return;
                }
            }
        }
        
        // Update particles
        this.particles = this.particles.filter(p => {
            p.life--;
            p.x += p.vx;
            p.y += p.vy;
            return p.life > 0;
        });
        
        // Check level complete
        if (this.zombies.length === 0) {
            this.levelComplete();
        }
    }

    handlePlayerAttack(attack) {
        const weapon = this.player.currentWeapon;
        this.audioManager.playSound(weapon.range > 100 ? 'shoot' : 'hit');
        
        const isRanged = weapon.range > 100;
        const isBow = weapon.name === 'Bow';
        const isLaser = weapon.name === 'Laser Gun';
        
        // Check if TNT is hit (only with ranged weapons)
        if (isRanged) {
            for (const tnt of this.tntBlocks) {
                if (tnt.checkHit(attack.x, attack.y, attack.range, attack.angle)) {
                    tnt.ignite();
                    this.audioManager.playSound('hit');
                }
            }
            
            if (isBow) {
                // Create arrow
                const arrow = new Arrow(
                    attack.x + Math.cos(attack.angle) * 25,
                    attack.y + Math.sin(attack.angle) * 25,
                    attack.angle,
                    attack.damage,
                    attack.range
                );
                this.arrows.push(arrow);
            } else if (isLaser) {
                // Create laser beam and hit all zombies in line
                const laser = new LaserBeam(
                    attack.x + Math.cos(attack.angle) * 25,
                    attack.y + Math.sin(attack.angle) * 25,
                    attack.angle,
                    attack.range,
                    attack.damage
                );
                this.lasers.push(laser);
                
                // Hit all zombies in laser path
                this.zombies.forEach((zombie, i) => {
                    if (this.isInLaserPath(laser.x, laser.y, laser.endX, laser.endY, zombie.x, zombie.y, zombie.size)) {
                        zombie.health -= attack.damage;
                        this.createBloodEffect(zombie.x, zombie.y);
                        
                        if (zombie.health <= 0) {
                            this.audioManager.playSound('kill');
                            this.player.score += zombie.typeData.scoreValue;
                            
                            // Death particles
                            for (let j = 0; j < 8; j++) {
                                this.particles.push({
                                    x: zombie.x,
                                    y: zombie.y,
                                    vx: (Math.random() - 0.5) * 4,
                                    vy: (Math.random() - 0.5) * 4,
                                    life: 30,
                                    color: zombie.typeData.color
                                });
                            }
                            
                            if (zombie.typeData.explodeOnDeath) {
                                this.handleExplosion(zombie.x, zombie.y);
                            }
                        }
                    }
                });
                
                // Remove dead zombies
                this.zombies = this.zombies.filter(z => z.health > 0);
                this.updateUI();
            } else {
                // Regular bullet weapons
                const bulletSpeed = weapon.name === 'Rocket Launcher' ? 8 : 12;
                const bullet = new Bullet(
                    attack.x + Math.cos(attack.angle) * 25,
                    attack.y + Math.sin(attack.angle) * 25,
                    attack.angle,
                    attack.damage,
                    attack.range,
                    bulletSpeed
                );
                this.bullets.push(bullet);
                
                // Shotgun fires multiple bullets
                if (weapon.name === 'Shotgun') {
                    for (let i = 0; i < 5; i++) {
                        const spreadAngle = attack.angle + (Math.random() - 0.5) * 0.4;
                        this.bullets.push(new Bullet(
                            attack.x + Math.cos(attack.angle) * 25,
                            attack.y + Math.sin(attack.angle) * 25,
                            spreadAngle,
                            attack.damage,
                            attack.range,
                            bulletSpeed
                        ));
                    }
                }
            }
        } else {
            // Melee weapons - instant hit detection
            for (let i = this.zombies.length - 1; i >= 0; i--) {
                const zombie = this.zombies[i];
                const dx = zombie.x - attack.x;
                const dy = zombie.y - attack.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                const angleToZombie = Math.atan2(dy, dx);
                const angleDiff = Math.abs(angleToZombie - attack.angle);
                
                if (distance <= attack.range && (angleDiff < 0.5 || angleDiff > Math.PI * 2 - 0.5)) {
                    zombie.health -= attack.damage;
                    this.createBloodEffect(zombie.x, zombie.y);
                    
                    if (zombie.health <= 0) {
                        this.audioManager.playSound('kill');
                        this.player.score += zombie.typeData.scoreValue;
                        
                        // Create death particles
                        for (let j = 0; j < 8; j++) {
                            this.particles.push({
                                x: zombie.x,
                                y: zombie.y,
                                vx: (Math.random() - 0.5) * 4,
                                vy: (Math.random() - 0.5) * 4,
                                life: 30,
                                color: zombie.typeData.color
                            });
                        }
                        
                        if (zombie.typeData.explodeOnDeath) {
                            this.handleExplosion(zombie.x, zombie.y);
                        }
                        
                        this.zombies.splice(i, 1);
                        this.updateUI();
                    }
                }
            }
        }
    }

    createBloodEffect(x, y) {
        // Create blood splatter particles
        for (let i = 0; i < 6; i++) {
            this.particles.push({
                x: x,
                y: y,
                vx: (Math.random() - 0.5) * 5,
                vy: (Math.random() - 0.5) * 5,
                life: 25,
                color: ['#8b0000', '#a00000', '#660000'][Math.floor(Math.random() * 3)]
            });
        }
    }

    isInLaserPath(x1, y1, x2, y2, px, py, radius) {
        // Calculate distance from point to line segment
        const A = px - x1;
        const B = py - y1;
        const C = x2 - x1;
        const D = y2 - y1;
        
        const dot = A * C + B * D;
        const lenSq = C * C + D * D;
        const param = lenSq !== 0 ? dot / lenSq : -1;
        
        let xx, yy;
        
        if (param < 0) {
            xx = x1;
            yy = y1;
        } else if (param > 1) {
            xx = x2;
            yy = y2;
        } else {
            xx = x1 + param * C;
            yy = y1 + param * D;
        }
        
        const dx = px - xx;
        const dy = py - yy;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        return distance < radius + 5; // 5 pixel tolerance for beam width
    }

    handleTNTExplosion(x, y) {
        const explosionRadius = 150;
        
        this.audioManager.playSound('kill');
        
        // Damage all nearby zombies
        for (let i = this.zombies.length - 1; i >= 0; i--) {
            const zombie = this.zombies[i];
            const dx = zombie.x - x;
            const dy = zombie.y - y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < explosionRadius) {
                const damage = 15 * (1 - distance / explosionRadius); // More damage closer to center
                zombie.health -= damage;
                
                if (zombie.health <= 0) {
                    this.player.score += zombie.typeData.scoreValue;
                    this.zombies.splice(i, 1);
                }
            }
        }
        
        // Damage player if nearby
        const dx = this.player.x - x;
        const dy = this.player.y - y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < explosionRadius) {
            this.player.takeDamage(2);
            this.updateUI();
        }
        
        // Chain reaction - ignite nearby TNT
        for (const tnt of this.tntBlocks) {
            const dx = tnt.x - x;
            const dy = tnt.y - y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < explosionRadius && !tnt.exploded && tnt.fuseTime === 0) {
                tnt.ignite();
            }
        }
        
        // Create massive explosion particles
        for (let i = 0; i < 40; i++) {
            this.particles.push({
                x: x,
                y: y,
                vx: (Math.random() - 0.5) * 12,
                vy: (Math.random() - 0.5) * 12,
                life: 60,
                color: ['#ff6600', '#ff3300', '#ffaa00', '#ff0000'][Math.floor(Math.random() * 4)]
            });
        }
        
        // Explosion ring
        for (let i = 0; i < 20; i++) {
            const angle = (i / 20) * Math.PI * 2;
            this.particles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * 8,
                vy: Math.sin(angle) * 8,
                life: 50,
                color: '#ffff00'
            });
        }
    }

    handleExplosion(x, y) {
        const explosionRadius = 100;
        
        // Damage nearby zombies
        this.zombies.forEach(zombie => {
            const dx = zombie.x - x;
            const dy = zombie.y - y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < explosionRadius) {
                zombie.health -= 5;
            }
        });
        
        // Damage player if nearby
        const dx = this.player.x - x;
        const dy = this.player.y - y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < explosionRadius) {
            this.player.takeDamage(1);
            this.updateUI();
        }
        
        // Create explosion particles
        for (let i = 0; i < 20; i++) {
            this.particles.push({
                x: x,
                y: y,
                vx: (Math.random() - 0.5) * 8,
                vy: (Math.random() - 0.5) * 8,
                life: 40,
                color: '#ff6600'
            });
        }
    }

    draw() {
        // Clear canvas
        this.ctx.fillStyle = '#2a2a3e';
        this.ctx.fillRect(0, 0, CONFIG.canvas.width, CONFIG.canvas.height);
        
        // Draw grid
        this.ctx.strokeStyle = '#333';
        this.ctx.lineWidth = 1;
        for (let i = 0; i < CONFIG.canvas.width; i += 50) {
            this.ctx.beginPath();
            this.ctx.moveTo(i, 0);
            this.ctx.lineTo(i, CONFIG.canvas.height);
            this.ctx.stroke();
        }
        for (let i = 0; i < CONFIG.canvas.height; i += 50) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, i);
            this.ctx.lineTo(CONFIG.canvas.width, i);
            this.ctx.stroke();
        }
        
        // Draw obstacles
        this.obstacles.forEach(obstacle => obstacle.draw(this.ctx));
        
        // Draw TNT blocks
        this.tntBlocks.forEach(tnt => tnt.draw(this.ctx));
        
        // Draw health potions
        this.healthPotions.forEach(potion => potion.draw(this.ctx));
        
        // Draw particles
        this.particles.forEach(p => {
            this.ctx.fillStyle = p.color;
            this.ctx.fillRect(p.x - 3, p.y - 3, 6, 6);
        });
        
        // Draw bullets
        this.bullets.forEach(bullet => bullet.draw(this.ctx));
        
        // Draw arrows
        this.arrows.forEach(arrow => arrow.draw(this.ctx));
        
        // Draw lasers
        this.lasers.forEach(laser => laser.draw(this.ctx));
        
        // Draw zombies
        this.zombies.forEach(zombie => zombie.draw(this.ctx));
        
        // Draw player
        if (this.player) {
            this.player.draw(this.ctx);
        }
        
        // Draw attack range indicator
        if (this.player) {
            this.ctx.strokeStyle = 'rgba(233, 69, 96, 0.3)';
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.arc(this.player.x, this.player.y, this.player.currentWeapon.range, 
                        this.player.angle - 0.3, this.player.angle + 0.3);
            this.ctx.stroke();
        }
        
        // Draw level info
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '20px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(`Zombies Remaining: ${this.zombies.length}`, CONFIG.canvas.width / 2, 30);
    }

    levelComplete() {
        if (this.currentLevel === 15) {
            this.victory();
        } else {
            this.showElevator();
        }
    }

    showElevator() {
        this.gameState = 'elevator';
        const nextLevel = this.currentLevel + 1;
        
        document.getElementById('next-level').textContent = nextLevel;
        document.getElementById('elevator-score').textContent = this.player.score;
        
        // Show available weapons
        const weaponsList = document.getElementById('weapons-list');
        weaponsList.innerHTML = '';
        
        // Determine available weapons
        const availableWeapons = Object.values(WEAPONS).filter(weapon => weapon.unlockLevel <= nextLevel);
        
        // Add two-column class if 5 or more weapons
        if (availableWeapons.length >= 5) {
            weaponsList.classList.add('two-columns');
        } else {
            weaponsList.classList.remove('two-columns');
        }
        
        availableWeapons.forEach(weapon => {
            const weaponDiv = document.createElement('div');
            weaponDiv.className = 'weapon-item';
            if (this.player.currentWeapon.name === weapon.name) {
                weaponDiv.classList.add('selected');
            }
            
            weaponDiv.innerHTML = `
                <h4>${weapon.name}</h4>
                <p>${weapon.description}</p>
                <p>Damage: ${weapon.damage} | Range: ${weapon.range} | Speed: ${(1000 / weapon.attackSpeed).toFixed(1)}/s</p>
            `;
            
            weaponDiv.addEventListener('click', () => {
                this.player.unlockWeapon(weapon.name);
                this.player.currentWeapon = weapon; // Set as active weapon
                document.querySelectorAll('.weapon-item').forEach(el => el.classList.remove('selected'));
                weaponDiv.classList.add('selected');
                this.updateUI();
            });
            
            weaponsList.appendChild(weaponDiv);
            
            // Auto-unlock new weapons
            if (!this.player.unlockedWeapons.includes(weapon.name)) {
                this.player.unlockWeapon(weapon.name);
            }
        });
        
        document.getElementById('elevator-screen').classList.remove('hidden');
    }

    continueToNextLevel() {
        this.currentLevel++;
        this.player.health = Math.min(this.player.health + 1, this.player.maxHealth); // Heal 1 heart
        this.gameState = 'playing';
        
        this.hideAllScreens();
        this.spawnZombies();
        this.updateUI();
        this.gameLoop();
    }

    gameOver() {
        this.gameState = 'gameover';
        document.getElementById('final-level').textContent = this.currentLevel;
        document.getElementById('final-score').textContent = this.player.score;
        document.getElementById('game-over-screen').classList.remove('hidden');
    }

    victory() {
        this.gameState = 'victory';
        document.getElementById('victory-score').textContent = this.player.score;
        document.getElementById('victory-screen').classList.remove('hidden');
    }

    togglePause() {
        this.isPaused = !this.isPaused;
        if (this.isPaused) {
            document.getElementById('pause-screen').classList.remove('hidden');
        } else {
            document.getElementById('pause-screen').classList.add('hidden');
            this.gameLoop();
        }
    }

    openWeaponMenu() {
        this.isPaused = true;
        const weaponsList = document.getElementById('ingame-weapons-list');
        weaponsList.innerHTML = '';
        
        // Add two-column class if 5 or more weapons
        if (this.player.unlockedWeapons.length >= 5) {
            weaponsList.classList.add('two-columns');
        } else {
            weaponsList.classList.remove('two-columns');
        }
        
        // Show available weapons
        this.player.unlockedWeapons.forEach(weaponName => {
            const weapon = WEAPONS[weaponName];
            const weaponDiv = document.createElement('div');
            weaponDiv.className = 'weapon-item';
            if (this.player.currentWeapon.name === weaponName) {
                weaponDiv.classList.add('selected');
            }
            
            weaponDiv.innerHTML = `
                <h4>${weapon.name}</h4>
                <p>${weapon.description}</p>
                <p>Damage: ${weapon.damage} | Range: ${weapon.range} | Speed: ${(1000 / weapon.attackSpeed).toFixed(1)}/s</p>
            `;
            
            weaponDiv.addEventListener('click', () => {
                this.player.currentWeapon = weapon;
                this.updateUI();
                document.querySelectorAll('#ingame-weapons-list .weapon-item').forEach(el => el.classList.remove('selected'));
                weaponDiv.classList.add('selected');
            });
            
            weaponsList.appendChild(weaponDiv);
        });
        
        document.getElementById('weapon-menu-screen').classList.remove('hidden');
    }

    closeWeaponMenu() {
        this.isPaused = false;
        document.getElementById('weapon-menu-screen').classList.add('hidden');
        this.gameLoop();
    }

    activateCheatCode() {
        // Jump to level 15 with all weapons unlocked
        this.currentLevel = 15;
        
        // Unlock all weapons
        this.player.unlockedWeapons = Object.keys(WEAPONS);
        
        // Give full health
        this.player.health = this.player.maxHealth;
        
        // Clear current enemies and spawn level 15
        this.zombies = [];
        this.spawnZombies();
        
        // Update UI
        this.updateUI();
        
        // Flash message
        const canvas = this.canvas;
        const ctx = this.ctx;
        const originalDraw = this.draw.bind(this);
        let flashCount = 0;
        const flashInterval = setInterval(() => {
            ctx.fillStyle = 'rgba(233, 69, 96, 0.3)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 36px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('CHEAT ACTIVATED - FINAL LEVEL!', canvas.width / 2, canvas.height / 2);
            
            flashCount++;
            if (flashCount > 3) {
                clearInterval(flashInterval);
            }
        }, 200);
    }

    hideAllScreens() {
        document.getElementById('start-screen').classList.add('hidden');
        document.getElementById('elevator-screen').classList.add('hidden');
        document.getElementById('game-over-screen').classList.add('hidden');
        document.getElementById('victory-screen').classList.add('hidden');
        document.getElementById('pause-screen').classList.add('hidden');
        document.getElementById('weapon-menu-screen').classList.add('hidden');
    }

    updateUI() {
        document.getElementById('current-level').textContent = this.currentLevel;
        document.getElementById('current-score').textContent = this.player ? this.player.score : 0;
        
        if (this.player) {
            // Update hearts
            const heartsContainer = document.getElementById('hearts-container');
            heartsContainer.innerHTML = '❤️'.repeat(this.player.health) + 
                                       '🖤'.repeat(this.player.maxHealth - this.player.health);
            
            // Update weapon
            document.getElementById('current-weapon').textContent = this.player.currentWeapon.name;
        }
    }
}

// Start the game when page loads
window.addEventListener('load', () => {
    new Game();
});
