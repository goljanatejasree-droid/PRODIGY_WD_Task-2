/**
 * AeroStopwatch - Professional Fitness & Sports Timing Script
 * Accurately tracks timing, toggles themes, and computes lap metrics.
 */

// --- Theme Management ---
const themeToggleBtn = document.getElementById('theme-toggle');
const sunIcon = themeToggleBtn.querySelector('.sun-icon');
const moonIcon = themeToggleBtn.querySelector('.moon-icon');

// Initialize Theme
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    setTheme(savedTheme);
}

function setTheme(theme) {
    if (theme === 'light') {
        document.documentElement.setAttribute('data-theme', 'light');
        sunIcon.classList.add('hidden');
        moonIcon.classList.remove('hidden');
        localStorage.setItem('theme', 'light');
    } else {
        document.documentElement.removeAttribute('data-theme');
        sunIcon.classList.remove('hidden');
        moonIcon.classList.add('hidden');
        localStorage.setItem('theme', 'dark');
    }
}

themeToggleBtn.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
    setTheme(currentTheme === 'light' ? 'dark' : 'light');
});

// --- Navigation Tabs Smooth Scroll ---
const navLinks = document.querySelectorAll('.nav-link');
navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        navLinks.forEach(l => l.classList.remove('active'));
        link.classList.add('active');
        
        const tabTarget = link.getAttribute('data-tab');
        if (tabTarget === 'stopwatch') {
            document.getElementById('stopwatch-section').scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else if (tabTarget === 'history') {
            document.getElementById('telemetry-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else if (tabTarget === 'about') {
            document.querySelector('.footer').scrollIntoView({ behavior: 'smooth' });
        }
    });
});

// --- Stopwatch State & Variable declarations ---
let startTime = 0;
let elapsedTime = 0;
let timerId = null;
let state = 'IDLE'; // States: 'IDLE', 'RUNNING', 'PAUSED'
let laps = [];      // Contains objects: { id, splitTime, totalTime }

// --- DOM Selectors ---
const hoursEl = document.getElementById('hours');
const minutesEl = document.getElementById('minutes');
const secondsEl = document.getElementById('seconds');
const millisecondsEl = document.getElementById('milliseconds');

const startPauseBtn = document.getElementById('start-pause-btn');
const lapResetBtn = document.getElementById('lap-reset-btn');

const startPauseText = document.getElementById('start-pause-text');
const lapResetText = document.getElementById('lap-reset-text');

const startIcons = startPauseBtn.querySelectorAll('.start-icon');
const pauseIcons = startPauseBtn.querySelectorAll('.pause-icon');
const lapIcons = lapResetBtn.querySelectorAll('.lap-icon');
const resetIcons = lapResetBtn.querySelectorAll('.reset-icon');

const logoIcon = document.querySelector('.brand-logo');
const timerCard = document.getElementById('timer-card');
const progressCircle = document.getElementById('progress-circle');
const lapsList = document.getElementById('laps-list');
const emptyState = document.getElementById('empty-state');

// Stats Counters
const fastestLapValEl = document.getElementById('fastest-lap-val');
const slowestLapValEl = document.getElementById('slowest-lap-val');
const totalLapsValEl = document.getElementById('total-laps-val');

// Circle Circumference Constants
const CIRCLE_CIRCUMFERENCE = 804.25; // 2 * PI * r (r=128)

// --- Helper Functions ---

/**
 * Formats time in milliseconds to a padded HH:MM:SS:MS object
 * @param {number} timeInMs 
 * @returns {object} Formatted time components
 */
function formatTime(timeInMs) {
    const hrs = Math.floor(timeInMs / 3600000);
    const mins = Math.floor((timeInMs % 3600000) / 60000);
    const secs = Math.floor((timeInMs % 60000) / 1000);
    const ms = Math.floor((timeInMs % 1000) / 10); // Centiseconds display (00-99)

    return {
        hours: hrs.toString().padStart(2, '0'),
        minutes: mins.toString().padStart(2, '0'),
        seconds: secs.toString().padStart(2, '0'),
        milliseconds: ms.toString().padStart(2, '0')
    };
}

/**
 * Returns a fully formatted stopwatch time string
 * @param {number} timeInMs 
 * @returns {string} HH:MM:SS:MS
 */
function formatTimeToString(timeInMs) {
    const timeObj = formatTime(timeInMs);
    return `${timeObj.hours}:${timeObj.minutes}:${timeObj.seconds}:${timeObj.milliseconds}`;
}

/**
 * Updates UI digital numbers
 * @param {number} timeInMs 
 */
function displayTime(timeInMs) {
    const timeObj = formatTime(timeInMs);
    hoursEl.textContent = timeObj.hours;
    minutesEl.textContent = timeObj.minutes;
    secondsEl.textContent = timeObj.seconds;
    millisecondsEl.textContent = timeObj.milliseconds;
}

/**
 * Updates the SVG circular sweep ring
 * Represents progress within a 60-second cycle
 * @param {number} timeInMs 
 */
function displayProgress(timeInMs) {
    // 60-second loop
    const progressPercent = (timeInMs % 60000) / 60000;
    const offset = CIRCLE_CIRCUMFERENCE - (progressPercent * CIRCLE_CIRCUMFERENCE);
    progressCircle.style.strokeDashoffset = offset;
}

/**
 * Sets visual cards matching current state glow configurations
 * @param {string} newState 
 */
function setGlowState(newState) {
    timerCard.classList.remove('state-idle', 'state-running', 'state-paused');
    if (newState === 'RUNNING') {
        timerCard.classList.add('state-running');
    } else if (newState === 'PAUSED') {
        timerCard.classList.add('state-paused');
    } else {
        timerCard.classList.add('state-idle');
    }
}

// --- Timing Loop ---

/**
 * Tick handler run by requestAnimationFrame
 */
function tick() {
    elapsedTime = performance.now() - startTime;
    displayTime(elapsedTime);
    displayProgress(elapsedTime);
    timerId = requestAnimationFrame(tick);
}

// --- State Transitions & Controls ---

/**
 * Start/Resume stopwatch operation
 */
function startStopwatch() {
    state = 'RUNNING';
    startTime = performance.now() - elapsedTime;
    
    // Trigger animation loop
    timerId = requestAnimationFrame(tick);
    
    // Glow Class update
    setGlowState('RUNNING');
    
    // Switch Start -> Pause styling
    startPauseBtn.classList.remove('btn-start');
    startPauseBtn.classList.add('btn-pause');
    startPauseText.textContent = 'Pause';
    startIcons.forEach(icon => icon.classList.add('hidden'));
    pauseIcons.forEach(icon => icon.classList.remove('hidden'));
    
    // Ensure Lap reset button shows Lap configuration and becomes active
    lapResetBtn.disabled = false;
    lapResetBtn.className = 'btn btn-secondary btn-lap';
    lapResetText.textContent = 'Lap';
    lapIcons.forEach(icon => icon.classList.remove('hidden'));
    resetIcons.forEach(icon => icon.classList.add('hidden'));
    
    // Spin Brand Logo
    logoIcon.style.animationPlayState = 'running';
}

/**
 * Pause stopwatch operation
 */
function pauseStopwatch() {
    state = 'PAUSED';
    
    // Terminate loops
    cancelAnimationFrame(timerId);
    
    // Glow Class update
    setGlowState('PAUSED');
    
    // Switch Pause -> Resume styling
    startPauseBtn.classList.remove('btn-pause');
    startPauseBtn.classList.add('btn-start');
    startPauseText.textContent = 'Resume';
    startIcons.forEach(icon => icon.classList.remove('hidden'));
    pauseIcons.forEach(icon => icon.classList.add('hidden'));
    
    // Switch Lap -> Reset styling
    lapResetBtn.className = 'btn btn-secondary btn-reset';
    lapResetText.textContent = 'Reset';
    lapIcons.forEach(icon => icon.classList.add('hidden'));
    resetIcons.forEach(icon => icon.classList.remove('hidden'));
    
    // Freeze logo spinning
    logoIcon.style.animationPlayState = 'paused';
}

/**
 * Reset stopwatch elements
 */
function resetStopwatch() {
    state = 'IDLE';
    
    // Halt logic
    cancelAnimationFrame(timerId);
    elapsedTime = 0;
    laps = [];
    
    // Clear displays
    displayTime(0);
    displayProgress(0);
    
    // Glow Class update
    setGlowState('IDLE');
    
    // Restore button defaults
    startPauseBtn.className = 'btn btn-primary btn-start';
    startPauseText.textContent = 'Start';
    startIcons.forEach(icon => icon.classList.remove('hidden'));
    pauseIcons.forEach(icon => icon.classList.add('hidden'));
    
    lapResetBtn.className = 'btn btn-secondary btn-lap';
    lapResetBtn.disabled = true;
    lapResetText.textContent = 'Lap';
    lapIcons.forEach(icon => icon.classList.remove('hidden'));
    resetIcons.forEach(icon => icon.classList.add('hidden'));
    
    // Rest logo
    logoIcon.style.animationPlayState = 'paused';
    
    // Flush Laps UI & Stats Deck
    renderLaps();
    updateStatsDeck();
}

/**
 * Records splits log
 */
function recordLap() {
    if (state !== 'RUNNING') return;
    
    const currentTotal = elapsedTime;
    let lapSplit = currentTotal;
    
    if (laps.length > 0) {
        const lastLapTotal = laps[laps.length - 1].totalTime;
        lapSplit = currentTotal - lastLapTotal;
    }
    
    const newLap = {
        id: laps.length + 1,
        splitTime: lapSplit,
        totalTime: currentTotal
    };
    
    laps.push(newLap);
    
    renderLaps();
    updateStatsDeck();
    
    // Smooth scroll the new lap row into focus inside the overflow block
    const tableWrapper = document.querySelector('.lap-table-body-wrapper');
    tableWrapper.scrollTo({ top: 0, behavior: 'smooth' });
}

/**
 * Recalculate statistics metrics (Fastest, Slowest, Total Laps)
 */
function updateStatsDeck() {
    totalLapsValEl.textContent = laps.length;
    
    if (laps.length === 0) {
        fastestLapValEl.textContent = '--:--:--:--';
        slowestLapValEl.textContent = '--:--:--:--';
        return;
    }
    
    if (laps.length === 1) {
        fastestLapValEl.textContent = formatTimeToString(laps[0].splitTime);
        slowestLapValEl.textContent = formatTimeToString(laps[0].splitTime);
        return;
    }
    
    let minSplit = Infinity;
    let maxSplit = -Infinity;
    
    laps.forEach(lap => {
        if (lap.splitTime < minSplit) minSplit = lap.splitTime;
        if (lap.splitTime > maxSplit) maxSplit = lap.splitTime;
    });
    
    fastestLapValEl.textContent = formatTimeToString(minSplit);
    slowestLapValEl.textContent = formatTimeToString(maxSplit);
}

/**
 * Render logs records dynamically
 */
function renderLaps() {
    if (laps.length === 0) {
        lapsList.innerHTML = '';
        emptyState.classList.remove('hidden');
        return;
    }
    
    emptyState.classList.add('hidden');
    
    let fastestIndex = -1;
    let slowestIndex = -1;
    let minSplit = Infinity;
    let maxSplit = -Infinity;
    
    if (laps.length >= 2) {
        laps.forEach((lap, index) => {
            if (lap.splitTime < minSplit) {
                minSplit = lap.splitTime;
                fastestIndex = index;
            }
            if (lap.splitTime > maxSplit) {
                maxSplit = lap.splitTime;
                slowestIndex = index;
            }
        });
        
        // Edge case: if all lap splits are identical, do not highlight
        if (minSplit === maxSplit) {
            fastestIndex = -1;
            slowestIndex = -1;
        }
    }
    
    lapsList.innerHTML = '';
    
    // Prepend new records to stack on top
    for (let i = laps.length - 1; i >= 0; i--) {
        const lap = laps[i];
        const row = document.createElement('li');
        row.className = 'lap-row';
        
        if (i === fastestIndex) {
            row.classList.add('fastest-row');
        } else if (i === slowestIndex) {
            row.classList.add('slowest-row');
        }
        
        row.innerHTML = `
            <span class="lap-row-num">Lap ${lap.id.toString().padStart(2, '0')}</span>
            <span class="lap-row-split">${formatTimeToString(lap.splitTime)}</span>
            <span class="lap-row-total">${formatTimeToString(lap.totalTime)}</span>
        `;
        
        lapsList.appendChild(row);
    }
}

// --- Event Handlers ---

startPauseBtn.addEventListener('click', () => {
    if (state === 'IDLE' || state === 'PAUSED') {
        startStopwatch();
    } else if (state === 'RUNNING') {
        pauseStopwatch();
    }
});

lapResetBtn.addEventListener('click', () => {
    if (state === 'RUNNING') {
        recordLap();
    } else if (state === 'PAUSED') {
        resetStopwatch();
    }
});

// Run Init setups
initTheme();
resetStopwatch();
