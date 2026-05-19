# Bugs & Optimizations — Neon Pulse

ผมไล่อ่านโค้ดทุกไฟล์อย่างละเอียดและพบประเด็นต่อไปนี้ จัดกลุ่มตามความสำคัญ

---

## 🔴 Bugs ที่กระทบ Gameplay

### 1. Lightning weapon เสีย ammo แม้ไม่มีศัตรูในระยะ
**ไฟล์:** `js/player.js` — `fireWeapon()`

ปัจจุบัน: ถ้ายิง Lightning ตอนไม่มี enemy ในระยะ 400px → ไม่มีอะไรเกิดขึ้น แต่ ammo ถูกหัก เพราะ ammo deduction อยู่นอก `if (nearest)`

**แก้:** track ว่ายิงสำเร็จไหม แล้วหัก ammo เฉพาะเมื่อยิงจริง

### 2. `applyExplosion` ใช้ `for...of` ขณะที่ `killEnemy` mutate array
**ไฟล์:** `js/player.js` — `applyExplosion()`

```js
for (const e of NP.enemies) {        // ← iterator
  if (NP.dist(...) < radius) {
    e.hp -= damage;
    if (e.hp <= 0) this.killEnemy(e); // ← splice ใน NP.enemies
  }
}
```

เมื่อ explosion ฆ่าศัตรู → `splice` ใน array ระหว่างที่ iterator วิ่ง → **enemy ตัวถัดไปอาจถูก skip** การระเบิดเลยทำดาเมจขาดๆ หายๆ

**แก้:** ใช้ reverse `for` loop

### 3. `applyExplosion` และ `chainLightning` bypass shield ของ `shielded` enemy
**ไฟล์:** `js/player.js`

ใน `Bullets.update()` มีการเช็ค shield ก่อนหัก HP แต่ใน `applyExplosion()` และ `chainLightning()` หัก `e.hp` ตรงๆ → shield ไร้ความหมายกับสองอย่างนี้

**แก้:** เพิ่ม helper `damageEnemy(e, amount)` แล้วใช้ทั่วทุกที่

### 4. `setTimeout` ตอน boss ตายยังทำงานต่อแม้ผู้เล่น restart เกม
**ไฟล์:** `js/player.js` — `killEnemy()` ตอน boss

```js
for (let i = 0; i < 6; i++) {
  setTimeout(() => {
    NP.Effects.spawnShockwave(...);
    NP.state.shake += 10;       // ← ค้างไปถึงเกมใหม่
  }, i * 120);
}
```

ผู้เล่นกด restart ตอนยังไม่ครบ 720ms → shake/shockwave ของ boss เก่าโผล่ในเกมใหม่

**แก้:** track timeout IDs แล้ว clear ตอน reset

### 5. Mouse ค้างกดถ้าลาก mouse ออกนอก window
**ไฟล์:** `js/input.js`

ไม่ได้ listen `mouseleave` หรือ `blur` → ถ้าผู้เล่น click แล้วลากเมาส์ออกนอก browser แล้วปล่อย → game ยังคิดว่า mouse กดอยู่ → ยิงไม่หยุด

**แก้:** เพิ่ม `mouseleave` และ `blur` listener

### 6. `spawnAt` จะ NaN score ถ้า type ไม่ตรง case ใดเลย
**ไฟล์:** `js/entities.js`

ปัจจุบันถ้า typo ใน type name → enemy ใช้ default values (hp=1) แต่ไม่มี `score` และ `speed` → ตอน kill score กลายเป็น `undefined * combo = NaN`

**แก้:** เพิ่ม default `score`, `speed` ใน init object

### 7. `chromAb += 0.5` ตอน overdrive เป็น dead code
**ไฟล์:** `js/game.js`

```js
s.chromAb += 0.5;                              // ← เพิ่ม 0.5
...
s.chromAb = s.shake * 0.5 + s.flash * 8 + ...; // ← overwrite ทิ้ง
```

บรรทัด `+= 0.5` ไม่มีผลใดๆ — overdrive bonus มาจากเทอม `(s.overdrive ? 4 : 0)` ในบรรทัดสุดท้ายอยู่แล้ว

**แก้:** ลบบรรทัดที่ตายแล้วทิ้ง

---

## 🟡 Bugs ที่เกี่ยวกับ Frame-rate Dependency

ถ้าผู้เล่นเล่นที่ 144Hz กับ 60Hz หรือเกิด lag spike, behavior จะต่างกัน

### 8. AI lerp factors ไม่ scale ตาม T
**ไฟล์:** `js/entities.js`

```js
e.vx = NP.lerp(e.vx, target, 0.05);   // ← 0.05 ต่อ frame, ไม่ใช่ต่อหน่วยเวลา
```

ที่ 144Hz: ศัตรู accelerate เร็วเป็น 2.4 เท่า — slow-mo (T=0.35) ก็ทำงานไม่ถูก เพราะ AI ยังคง accelerate เท่าเดิม

**แก้:** ใช้ `1 - Math.pow(0.95, T)` แทน

### 9. Star twinkle และ floater vy decay ไม่ scale ตาม T
**ไฟล์:** `js/background.js`, `js/effects.js`

```js
s.tw += 0.03;       // background.js — frame-dependent
f.vy *= 0.97;       // effects.js — frame-dependent
```

**แก้:** คูณด้วย T / `Math.pow(0.97, T)`

### 10. Grid offset อาจเป็นค่าลบทำให้เส้นกระตุก
**ไฟล์:** `js/background.js`

JS modulo สำหรับค่าลบ: `-5 % 60 = -5` (ไม่ใช่ 55 อย่างที่หลายคนเข้าใจ) → ตอน player เคลื่อนทำให้ `time*0.15 - player.x*0.05` ติดลบ → grid เริ่มก่อน x=0 → เส้นอาจกระตุกตอน wrap

**แก้:** ใช้ `((v % m) + m) % m` แทน

---

## 🟢 Performance Optimizations

### 11. HUD เขียน DOM ทุกเฟรมแม้ค่าไม่เปลี่ยน
**ไฟล์:** `js/hud.js`

`update()` เรียก 60 ครั้ง/วินาที set `textContent`/`style.width` ของ ~10 elements โดยไม่เช็คว่าค่าเปลี่ยนไหม → trigger layout/paint บ่อยเกินจำเป็น

**แก้:** cache last values แล้ว skip ถ้าไม่เปลี่ยน

### 12. Enemy bullet trails ใช้ random spawn (ไม่ scale T)
**ไฟล์:** `js/entities.js`

```js
if (Math.random() < 0.3) { ... spawn particle ... }
```

- ที่ 144Hz: spawn เร็วขึ้น 2.4 เท่า
- Slow-mo: spawn ปกติ (T น้อยแต่ random ไม่สนใจ)
- Bullet เยอะ → particle เยอะมาก

**แก้:** ใช้ timer-based แบบเดียวกับ player bullet trails

### 13. Star rendering สร้าง rgba string ใหม่ทุกตัวทุกเฟรม
**ไฟล์:** `js/background.js`

350 stars × 60 fps = 21,000 string allocations/วินาที สำหรับ `rgba(...)` strings → garbage pressure

**แก้:** group stars ตาม layer (ใช้ fillStyle เดียวต่อ layer) + ใช้ alpha สำหรับ twinkle แทน

### 14. `sfx.overdrive` ถูก declared แต่ไม่ถูกเรียกที่ไหนเลย
**ไฟล์:** `js/audio.js`

Dead code minor — เพิ่มการเรียกตอนเข้า overdrive ครั้งแรก (ไม่ใช่ทุกเฟรม)

---

## สรุปไฟล์ที่แก้

| ไฟล์ | Bugs แก้ |
|---|---|
| `game.js` | #7 |
| `player.js` | #1, #2, #3, #4 |
| `input.js` | #5 |
| `entities.js` | #6, #8, #12 |
| `effects.js` | #9 |
| `background.js` | #9, #10, #13 |
| `hud.js` | #11 |
| `audio.js` | #14 |

ไฟล์ `config.js`, `utils.js`, `state.js`, `render.js`, `waves.js`, `index.html`, `style.css` ไม่มีการแก้ไข
