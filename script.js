// --- BACKGROUND ANIMATION ---
const canvas = document.getElementById('bgCanvas');
const ctx = canvas.getContext('2d');
let particles = [];
function resize() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
window.addEventListener('resize', resize);
resize();

class Particle {
    constructor() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.size = Math.random() * 2 + 0.5;
        this.speedX = Math.random() * 0.5 - 0.25;
        this.speedY = Math.random() * 0.5 - 0.25;
        this.opacity = Math.random() * 0.5;
    }

    update() {
        this.x += this.speedX; this.y += this.speedY;
        if (this.x > canvas.width) this.x = 0; if (this.x < 0) this.x = canvas.width;
        if (this.y > canvas.height) this.y = 0; if (this.y < 0) this.y = canvas.height;
    }

    draw() { ctx.fillStyle = `rgba(148, 163, 184, ${this.opacity})`; ctx.beginPath(); ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2); ctx.fill(); }

}

for (let i = 0; i < 60; i++) particles.push(new Particle());

function animate() { ctx.clearRect(0, 0, canvas.width, canvas.height); particles.forEach(p => { p.update(); p.draw(); }); requestAnimationFrame(animate); }
animate();

// --- GAME LOGIC ---
const emailInput = document.getElementById('emailInput');
const rulesContainer = document.getElementById('rulesContainer');
const charCount = document.getElementById('charCount');
const progressFill = document.getElementById('progressFill');
const scrollWrapper = document.getElementById('scrollWrapper');

let maxUnlockedRule = 1;
let dinoPhase = false;
let timeLeft = 32;
let timerInterval = null;
let rule8Percent = 0;
let currentSum = 0;
let dinoRule9Locked = false;
let dinoRule13Locked = false;
let dinoRule14Locked = false;
let primeRuleLocked = false;
let rule19Locked = false;
let rule20Locked = false;
let rule20Started = false;
let rule20Timer = null;
let rule20TimeLeft = 8;
let rule6Locked = false;
let rule21Locked = false;
let rule21Started = false;
let scrambleMap = {};
let reverseTarget = "";
let rule24Locked = false;
let rule27Locked = false;
let rule27Started = false;
let rule28StruggleCount = 0;
let rule28HintShown = false;
let finalBtnFrozen = false;
let startTime = Date.now();

// Rule 26: Console Code (Letters only, one-liner)
window.debugCode = Math.random().toString(36).replace(/[0-9]/g, '').substring(0, 6);
window.powerCode = Math.random().toString(36).replace(/[0-9]/g, '').substring(0, 7);

window.keyboardUnlocked = false;
window.finalButtonClicked = false;

console.log("DEBUG CODE:", window.debugCode);

window.rule9HintShown = false;

const rules = [
    { id: 1, desc: "❌ Size matters. Your email needs at least 8 characters.", check: (s) => s.length >= 8 },
    { id: 2, desc: "❌ Spaces? In an email? Remove them.", check: (s) => !s.includes(' ') },
    { id: 3, desc: "❌ Give me a digit. Put one in.", check: (s) => /\d/.test(s) },
    { id: 4, desc: "❌ Add a special character. No @ allowed.", check: (s) => { const specials = s.match(/[^a-zA-Z0-9\s@]/g); return specials && specials.length > 0; } },
    { id: 5, desc: "❌ Needs more breath. Keep it between 10 and 20 vowels.", check: (s) => { const count = (s.match(/[aeiou]/gi) || []).length; return count >= 10 && count <= 20; } },
    {
        id: 6,
        desc: "❌ No letter can appear more than 3 times.",
        check: (s) => {

            if (rule6Locked) return true;

            const counts = {};

            for (let char of s.toLowerCase().replace(/[^a-z]/g, "")) {
                counts[char] = (counts[char] || 0) + 1;
                if (counts[char] > 3) return false;
            }

            return true;
        }
    },
    { id: 7, desc: "❌ Put today's date (DD/MM/YYYY) in there.", check: (s) => { const now = new Date(); const today = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`; return s.includes(today); } },
    { id: 8, desc: "❌ Balance your caps! Exactly 15% - 20% must be UPPERCASE.", check: (s) => { if (s.length === 0) return false; const upper = (s.match(/[A-Z]/g) || []).length; rule8Percent = ((upper / s.length) * 100).toFixed(1); return rule8Percent >= 15 && rule8Percent <= 20; } },
    {
        id: 9,
        desc: "You lost my 🦖. Put him back.",
        check: (s) => {
            const hasDino = s.includes("🦖");

            // trigger hint when rule is first broken
            if (hasDino && !window.rule9HintShown) {
                window.rule9HintShown = true;

                showHint("You can lock the button with the SHIFT key!!");
            }

            return hasDino;
        }
    },
    { id: 10, desc: "❌ Chemistry fail: Add the element for symbol Mo.", check: (s) => s.toLowerCase().includes('molybdenum') },
    {
        id: 11, desc: "❌ Add the current hour (0-23).", check: (s) => {
            const hour = new Date().getHours();
            return s.includes(hour.toString()) || s.includes(hour.toString().padStart(2, '0'));
        }
    },

    {
        id: 12, desc: "❌ Your digits must add up to exactly 45.", check: (s) => {
            const digits = s.match(/\d/g) || [];
            currentSum = digits.reduce((a, b) => a + parseInt(b), 0);
            return currentSum === 45;
        }
    },
    { id: 13, desc: "❌ The 🦖 needs a digit exactly 3 spaces away.", check: (s) => { const chars = [...s]; const idx = chars.indexOf('🦖'); if (idx === -1) return false; const neighbors = [idx - 3, idx + 3]; return neighbors.some(nIdx => { if (nIdx < 0 || nIdx >= chars.length) return false; if (!/\d/.test(chars[nIdx])) return false; const step = nIdx > idx ? 1 : -1; return !/\d/.test(chars[idx + step]) && !/\d/.test(chars[idx + (step * 2)]); }); } },
    { id: 14, desc: "❌ The 🦖 is exposed! Put letters on both sides of him.", check: (s) => { const chars = [...s]; const i = chars.indexOf('🦖'); return i > 0 && i < chars.length - 1 && /[a-z]/i.test(chars[i - 1]) && /[a-z]/i.test(chars[i + 1]); } },
    { id: 15, desc: "❌ Lab work: Add the element with atomic mass 86.", check: (s) => s.toLowerCase().includes('radon') },
    { id: 16, desc: "❌ Add the current day of the week.", check: (s) => { const day = new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(new Date()); return s.toLowerCase().includes(day.toLowerCase()); } },

    {
        id: 17,
        desc: "❌ The length of your email must be a Prime Number.",
        check: (s) => {

            // once solved, permanently solved
            if (primeRuleLocked) return true;

            const n = [...s].length;

            if (n <= 1) return false;

            for (let i = 2; i <= Math.sqrt(n); i++) {
                if (n % i === 0) return false;
            }

            // lock forever after first success
            primeRuleLocked = true;
            return true;
        }
    },
    {
        id: 19,
        desc: "The first 4 characters of your email must appear in reverse at the very end of the email.",
        check: (s) => {

            // once solved, always solved
            if (rule19Locked) return true;

            const chars = [...s];

            if (chars.length < 8) return false;

            // first 4 characters
            const first4 = chars.slice(0, 4);

            // reverse them
            const reversed = [...first4].reverse().join("");

            // last 4 characters
            const last4 = chars.slice(-4).join("");

            if (last4.toLowerCase() === reversed.toLowerCase()) {
                rule19Locked = true;
                return true;
            }

            return false;
        },

        brokenMsg: "❌ Your email forgot how mirrors work."
    },

    {
        id: 20,
        desc: "🚨 SYSTEM FAILURE 🚨<br>Type <b>fix</b> in your email or your email will be nuked.<br>⏳ 8s",

        check: (s) => {

            if (rule20Locked) return true;

            if (!rule20Started) {
                startRule20Timer();
                rule20Started = true;
            }

            if (s.toLowerCase().includes("fix")) {
                clearInterval(rule20Timer);
                rule20Locked = true;
                rules[18].desc = "✅ SYSTEM FAILURE repaired.";
                return true;
            }

            return false;
        }
    },

    {
        id: 21,
        desc: "⌨️ KEYBOARD CORRUPTED, your keys are randomized! Type 'reverse' to fix it.",
        check: (s) => {
            if (rule21Locked) return true;

            if (!rule21Started) {
                startRule21();
                rule21Started = true;
            }

            if (s.toLowerCase().includes("reverse")) {
                stopRule21(); // Restores keyboard
                rule21Locked = true;
                return true; // This True triggers maxUnlockedRule++ in validate()
            }
            return false;
        }
    },
 {
        id: 22,
        desc: "The 🦖 is escaping. Add 📹 to monitor it.",
        check: (s) => {
            const hasDino = s.includes("🦖");
            const hasCam = s.includes("📹");
            
            // If they have the Dino but remove the camera, reset!
            if (hasDino && !hasCam && dinoPhase && maxUnlockedRule > 22) {
                resetGame("The Dino escaped because you stopped watching him.");
                return false;
            }
            return hasDino && hasCam;
        }
    },

    {
        id: 23,
        desc: "Decode This code and write the decoded message in your email. - 'gsv-vnzro-tznv'",
        check: (s) => s.toLowerCase().includes("the-email-game"),
        brokenMsg: "❌ Morse code was readable. You just chose confusion."
    },

{
        id: 24,
        desc: "Browser window must be a perfect square.",
        check: (s) => {
            if (rule24Locked) return true;
            const isSquare = Math.abs(window.innerWidth - window.innerHeight) <= 50;
            if (isSquare) rule24Locked = true; // Lock it forever once they hit it
            return isSquare;
        }
    },

{
    id: 25,
    desc: "🔭 The void has a signature. You must include the Hex Code of the current background color.",
    check: (s) => {
        // 1. Get the computed color from the body (it usually returns "rgb(x, y, z)")
        const bgColor = window.getComputedStyle(document.body).backgroundColor;

        // 2. Helper function to convert RGB to HEX
        const rgbToHex = (rgb) => {
            const result = rgb.match(/\d+/g).map(x => {
                const hex = parseInt(x).toString(16);
                return hex.length === 1 ? "0" + hex : hex;
            });
            return "#" + result.join("");
        };

        const currentHex = rgbToHex(bgColor);

        // 3. Check if the player's input includes the current hex
        // This works whether your background is #0a0a0a, #000, or anything else!
        return s.toLowerCase().includes(currentHex);
    }
},

    {
        id: 26,
        desc: "Find the debug code in console and type it.",
        check: (s) => s.includes(window.debugCode),
        brokenMsg: "❌ The console literally helped you. You ignored it."
    },

{
    id: 27,
    desc: "⚠️ Power failure. Use your flashlight and catch the moving 7-letter emergency code.",
    check: (s) => {

        if (rule27Locked) return true;

        const darkness = document.getElementById("darkness");
        const codeElement = document.getElementById("hiddenPowerCode");

        // START RULE 27 ONCE
        if (!rule27Started && maxUnlockedRule === 27) {

            rule27Started = true;

            // Generate 7-letter code
            window.powerCode = Math.random()
                .toString(36)
                .replace(/[0-9]/g, '')
                .substring(0, 7)
                .toLowerCase();

            codeElement.innerText = window.powerCode;

            // Show blackout first
            darkness.style.display = "block";
            darkness.style.opacity = "1";

            let flickers = 0;

            const flicker = setInterval(() => {

                darkness.style.opacity =
                    darkness.style.opacity === "1" ? "0.15" : "1";

                flickers++;

                if (flickers >= 8) {
                    clearInterval(flicker);

                    // Full darkness + flashlight mode
                    darkness.style.opacity = "1";
                    darkness.classList.add("flashlight-active");

                    // Show hidden code AFTER flicker
                    codeElement.style.display = "block";

                    // Teleport code constantly
                    window.rule27Teleport = setInterval(() => {

                        let x, y;

                        do {
                            x = Math.random() * (window.innerWidth - 140);
                            y = Math.random() * (window.innerHeight - 50);
                        }
                        while (
                            x > window.innerWidth * 0.2 &&
                            x < window.innerWidth * 0.8 &&
                            y > window.innerHeight * 0.15 &&
                            y < window.innerHeight * 0.85
                        );

                        codeElement.style.left = x + "px";
                        codeElement.style.top = y + "px";

                    }, 900);

                }

            }, 120);
        }

        // SOLVED
        if (s.toLowerCase().includes(window.powerCode)) {

            rule27Locked = true;

            clearInterval(window.rule27Teleport);

            darkness.classList.remove("flashlight-active");
            darkness.style.display = "none";

            codeElement.style.display = "none";

            return true;
        }

        return false;
    }
},
{
    id: 28,
    desc: "🏁 FINAL RULE: Just click the button to win.",
    check: (s) => window.finalButtonClicked === true
}
];

function startRule21() {

    const letters = "abcdefghijklmnopqrstuvwxyz".split("");
    const shuffled = [...letters].sort(() => Math.random() - 0.5);

    scrambleMap = {};

    for (let i = 0; i < letters.length; i++) {
        scrambleMap[letters[i]] = shuffled[i];
    }

    reverseTarget = "";

    for (let ch of "reverse") {
        reverseTarget += scrambleMap[ch];
    }
}

function stopRule21() {
    scrambleMap = {};
    rule21Started = false; // Add this to prevent it from re-triggering
}

emailInput.addEventListener("keydown", function (e) {
    // If the rule is locked or hasn't started, don't do anything (normal typing)
    if (!rule21Started || rule21Locked) return;

    const key = e.key.toLowerCase();

    // Only scramble if it's a letter AND the map actually has data
    if (/^[a-z]$/.test(key) && Object.keys(scrambleMap).length > 0) {
        e.preventDefault();

        const mapped = scrambleMap[key];
        const start = emailInput.selectionStart;
        const end = emailInput.selectionEnd;
        const val = emailInput.value;

        emailInput.value = val.slice(0, start) + mapped + val.slice(end);
        emailInput.selectionStart = emailInput.selectionEnd = start + 1;

        validate();
    }
});

function validate() {
    autoResize();
    const val = emailInput.value;
    charCount.innerText = [...val].length;

    // Locked Dino rules
    if (checkDinoLocks(val)) return;

    // Dino safety check
    if (dinoPhase) {
        const chars = [...val];
        const i = chars.indexOf("🦖");

        if (
            !val.includes("🦖") ||
            i === 0 ||
            i === chars.length - 1 ||
            !/[a-z]/i.test(chars[i - 1]) ||
            !/[a-z]/i.test(chars[i + 1])
        ) {
            resetGame("The Dino has perished. Lawyers are approaching.");
            return;
        }
    }

    let currentBroken = [];
    let passedAll = true;

    for (let i = 0; i < rules.length; i++) {
        const rule = rules[i];

        // 🔥 During Rule 18, only check rules 1-17
        if (dinoPhase && maxUnlockedRule === 18) {
            if (rule.id > 17) continue;
        } else {
            if (rule.id > maxUnlockedRule) continue;
        }

        if (!rule.check(val)) {
            currentBroken.push(rule);
            passedAll = false;
        } else if (!dinoPhase && rule.id === maxUnlockedRule && passedAll) {
            maxUnlockedRule++;
        }
    }

    render(currentBroken);

    // ===== Start Rule 18 =====
    if (!dinoPhase && maxUnlockedRule === 18) {
        startDinoPhase();
        return;
    }

    // ===== Complete Rule 18 =====
    if (dinoPhase && maxUnlockedRule === 18 && passedAll) {
        clearInterval(timerInterval);
        document.getElementById("dinoWarning").classList.add("hidden");

        rule6Locked = true;

        maxUnlockedRule = 19;
        validate();
        return;
    }

    // ===== Progress Rules 19-28 =====
    // ===== Progress Rules 19-28 =====
    if (dinoPhase && maxUnlockedRule >= 19) {
        // Find the specific rule the player is currently trying to solve
        const currentRule = rules.find(r => r.id === maxUnlockedRule);

        if (dinoPhase && maxUnlockedRule === 28 && passedAll) {
            startFinalButton();
        }

        if (currentRule && currentRule.check(val)) {
            maxUnlockedRule++; // Move to next rule immediately

            // If we just finished Rule 21, ensure keyboard is restored
            if (currentRule.id === 21) {
                stopRule21();
                rule21Locked = true;
            }

            validate(); // Refresh to show Rule 22 (or the next one)
            return;
        }
    }

    // ===== Win =====
    if (window.finalButtonClicked) {
    winGame();
    return;
    }
    
}

function render(brokenRules) {
    rulesContainer.innerHTML = "";

    // 1. Identify the "Current" rule the player is actually on
    // We subtract 1 because maxUnlockedRule is always the NEXT rule
    const currentActiveId = maxUnlockedRule - (maxUnlockedRule > rules.length ? 1 : 0);

    // 2. Separate the broken rules into "Current" and "Old"
    const currentRuleObj = brokenRules.find(r => r.id === currentActiveId);
    const otherBrokenRules = brokenRules.filter(r => r.id !== currentActiveId);

    // 3. Always show the Current Rule at the top (if it's broken)
    if (currentRuleObj) {
        renderCard(currentRuleObj, true);
    } else if (maxUnlockedRule <= rules.length) {
        // Even if the current rule is technically "satisfied", 
        // we might want to keep it there or handle the transition.
        // For now, we focus on broken rules.
    }

    // 4. Show all other broken rules (like Rule 8, Rule 12) BELOW it
    // Sorted by ID descending so the most recent ones are higher up
    otherBrokenRules.sort((a, b) => b.id - a.id).forEach(rule => {
        renderCard(rule, false);
    });
}

function renderCard(rule, isPinned) {
    const div = document.createElement("div");
    div.className = "rule-card" + (isPinned ? " pinned" : "");

    // Optional: add a slight visual cue for the pinned one without the gold box
    if (isPinned) div.style.borderColor = "var(--accent)";

    let content = `<strong>Rule ${rule.id}</strong><br>`;
    if (rule.id === 8) content += `📊 Uppercase: ${rule8Percent}%<br>`;

    content += rule.desc;
    div.innerHTML = content;
    rulesContainer.appendChild(div);
}

function checkDinoLocks(val) {
    const rule9 = rules[8].check(val);
    const rule13 = rules[12].check(val);
    const rule14 = rules[13].check(val);
    const rule22 = val.includes("📹"); // Camera check

    if (rule9) dinoRule9Locked = true;
    if (rule13) dinoRule13Locked = true;
    if (rule14) dinoRule14Locked = true;
    
    // Lock the camera requirement once they've reached Rule 23
    let cameraLocked = (maxUnlockedRule > 22);

    if (dinoRule9Locked && !rule9) {
        resetGame("You removed the Dino.");
        return true;
    }
    if (dinoRule13Locked && !rule13) {
        resetGame("The Dino lost its 3-space digit.");
        return true;
    }
    if (dinoRule14Locked && !rule14) {
        resetGame("The Dino lost letter protection.");
        return true;
    }
    // RESET if they delete the camera after Rule 22
    if (cameraLocked && !rule22) {
        resetGame("The Dino escaped! You removed the camera.");
        return true;
    }

    return false;
}

function startDinoPhase() {
    if (dinoPhase) return;

    dinoPhase = true;

    document.getElementById('dinoWarning').classList.remove('hidden');

    dinoChomp();

    timerInterval = setInterval(() => {
        timeLeft--;
        progressFill.style.width = `${(timeLeft / 32) * 100}%`;

        if (timeLeft <= 0) {
            dinoChomp();
            timeLeft = 32;
        }
    }, 1000);
}

function dinoChomp() {
    let chars = [...emailInput.value];

    const dinoIdx = chars.indexOf("🦖");
    if (dinoIdx === -1) return;

    // ===== Protected indices =====
    let protectedSet = new Set();

    // Dino itself
    protectedSet.add(dinoIdx);

    // Rule 14 protection letters (both sides)
    protectedSet.add(dinoIdx - 1);
    protectedSet.add(dinoIdx + 1);

    // ===== Rule 13 protection =====
    // digit exactly 3 spaces away + letters between

    const possibleTargets = [dinoIdx - 3, dinoIdx + 3];

    for (let target of possibleTargets) {
        if (target < 0 || target >= chars.length) continue;

        if (/\d/.test(chars[target])) {

            // protect the digit
            protectedSet.add(target);

            // protect chars between dino and digit
            const step = target > dinoIdx ? 1 : -1;

            protectedSet.add(dinoIdx + step);
            protectedSet.add(dinoIdx + step * 2);
        }
    }

    // ===== Build removable pool =====
    let removable = [];

    for (let i = 0; i < chars.length; i++) {
        if (!protectedSet.has(i) && chars[i] !== "") {
            removable.push(i);
        }
    }

    // ===== Remove 5 random safe chars =====
    for (let i = 0; i < 5 && removable.length > 0; i++) {
        const rand = Math.floor(Math.random() * removable.length);
        const removeIndex = removable.splice(rand, 1)[0];
        chars[removeIndex] = "";
    }

    emailInput.value = chars.join("");

    autoResize();
    validate();
}

function showHint(text) {
    const hint = document.createElement("div");

    hint.innerText = text;

    // ===== STYLE =====
    hint.style.position = "fixed";
    hint.style.padding = "16px 22px";
    hint.style.background = "linear-gradient(135deg, rgba(10,10,10,0.95), rgba(35,35,35,0.9))";
    hint.style.color = "#f8fafc";
    hint.style.borderRadius = "14px";
    hint.style.fontSize = "20px";
    hint.style.fontWeight = "800";
    hint.style.zIndex = 9999;

    hint.style.letterSpacing = "1px";
    hint.style.border = "1px solid rgba(148,163,184,0.25)";
    hint.style.boxShadow = "0 15px 40px rgba(0,0,0,0.6)";
    hint.style.backdropFilter = "blur(6px)";
    hint.style.textShadow = "0 0 8px rgba(255,255,255,0.15)";

    // ===== SAFE RANDOM POSITION (avoids center UI) =====
    const padding = 20;

    const centerBlockX1 = window.innerWidth * 0.2;
    const centerBlockX2 = window.innerWidth * 0.8;
    const centerBlockY1 = window.innerHeight * 0.2;
    const centerBlockY2 = window.innerHeight * 0.8;

    let x, y;

    do {
        x = Math.random() * (window.innerWidth - 260 - padding);
        y = Math.random() * (window.innerHeight - 100 - padding);
    } while (
        x > centerBlockX1 && x < centerBlockX2 &&
        y > centerBlockY1 && y < centerBlockY2
    );

    hint.style.left = x + "px";
    hint.style.top = y + "px";

    // ===== RANDOM ROTATION =====
    const rotate = (Math.random() * 14 - 7); // -7 to +7 degrees
    const scale = 0.95 + Math.random() * 0.1; // slight size variation

    hint.style.transform = `rotate(${rotate}deg) scale(${scale})`;

    // ===== SMOOTH ENTRY =====
    hint.style.opacity = "0";
    hint.style.transition = "all 0.2s ease-out";

    document.body.appendChild(hint);

    setTimeout(() => {
        hint.style.opacity = "1";
        hint.style.transform = `rotate(${rotate}deg) scale(1)`;
    }, 10);

    // ===== AUTO REMOVE =====
    setTimeout(() => {
        hint.style.opacity = "0";
        setTimeout(() => hint.remove(), 200);
    }, 4500);
}

function startRule20Timer() {

    rule20TimeLeft = 8;

    rule20Timer = setInterval(() => {

        rule20TimeLeft--;

        rules[18].desc =
            "🚨 SYSTEM FAILURE 🚨<br>" +
            "Type <b>fix</b> in your email or your email will be nuked.<br>" +
            "⏳ " + rule20TimeLeft + "s";

        validate(); // refresh screen

        if (rule20TimeLeft <= 0) {
            clearInterval(rule20Timer);
            resetGame("🚨 SYSTEM FAILURE 🚨 You failed to type FIX in time.");
        }

    }, 1000);
}

function autoResize() {
    const emailInput = document.getElementById('emailInput');
    emailInput.style.height = 'auto'; // Reset height
    emailInput.style.height = emailInput.scrollHeight + 'px'; // Set to actual text height
}

function winGame() {
    clearInterval(timerInterval);
    document.getElementById('winScreen').classList.remove('hidden');
    document.getElementById('dinoWarning').classList.add('hidden');
    rulesContainer.innerHTML = '';
    emailInput.disabled = true;
}

function resetGame(reason) {
    clearInterval(timerInterval);

    document.getElementById("resetReason").innerText = reason;
    document.getElementById("resetScreen").classList.remove("hidden");

    document.getElementById("dinoWarning").classList.add("hidden");
    emailInput.disabled = true;
}

emailInput.addEventListener('input', validate);

window.addEventListener('resize', () => {
    validate();
});

window.addEventListener("mousemove", (e) => {

    const darkness = document.getElementById("darkness");

    if (darkness.style.display === "block") {
        darkness.style.setProperty("--cursor-x", e.clientX + "px");
        darkness.style.setProperty("--cursor-y", e.clientY + "px");
    }

});

let finalStarted = false;
window.shiftHeld = false;

document.addEventListener("keydown", e => {
    if (e.key === "Shift") window.shiftHeld = true;
});

document.addEventListener("keyup", e => {
    if (e.key === "Shift") window.shiftHeld = false;
});

function startFinalButton() {

    if (finalStarted) return;
    finalStarted = true;

    const btn = document.createElement("button");
    btn.id = "winBtn";
    btn.innerText = "CLAIM YOUR VICTORY!!";
    document.body.appendChild(btn);

    // initial style
    btn.style.position = "fixed";
    btn.style.left = "50%";
    btn.style.top = "50%";
    btn.style.transform = "translate(-50%, -50%)";
    btn.style.transition = "left 0.25s cubic-bezier(.22,.9,.3,1), top 0.25s cubic-bezier(.22,.9,.3,1), transform 0.12s ease";

    moveBtn();

    // SHIFT lock (same as your test)
    document.addEventListener("keydown", e => {
        if (e.key === "Shift") {
            finalBtnFrozen = true;
            btn.classList.add("frozen");
        }
    });

    document.addEventListener("keyup", e => {
        if (e.key === "Shift") {
            finalBtnFrozen = false;
            btn.classList.remove("frozen");
        }
    });

    // mouse escape logic
    document.addEventListener("mousemove", (e) => {

        if (finalBtnFrozen) return;

        const rect = btn.getBoundingClientRect();

        const dx = e.clientX - (rect.left + rect.width / 2);
        const dy = e.clientY - (rect.top + rect.height / 2);
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 130) {
            rule28StruggleCount++;
            moveBtn();

            // 💡 delayed hint (after struggle)
            if (rule28StruggleCount >= 13 && !rule28HintShown) {
                rule28HintShown = true;
                showHint("💡 The hint was given to you earlier during rule 10...");
            }
        }
    });

    // win condition
    btn.onclick = () => {
        if (finalBtnFrozen) {
            window.finalButtonClicked = true;
            btn.remove();
            validate();
        } else {
            moveBtn();;
        }
    };
}

function moveBtn(mouseX = window.innerWidth / 2, mouseY = window.innerHeight / 2) {

    const btn = document.getElementById("winBtn");
    if (!btn) return;

    const pad = 20;

    const w = btn.offsetWidth;
    const h = btn.offsetHeight;

    const maxX = window.innerWidth - w - pad;
    const maxY = window.innerHeight - h - pad;

    let x, y;

    // 🔥 keep trying until it's safely away from mouse
    let tries = 0;

    do {
        x = pad + Math.random() * maxX;
        y = pad + Math.random() * maxY;
        tries++;
    } while (
        Math.hypot(mouseX - (x + w/2), mouseY - (y + h/2)) < 180 && tries < 20
    );

    btn.style.left = x + "px";
    btn.style.top = y + "px";

    btn.style.transform =
        `rotate(${Math.random() * 10 - 5}deg) scale(1)`;
}

validate();
