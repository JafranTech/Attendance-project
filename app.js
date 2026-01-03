/**
 * Student Attendance PWA Logic
 */

// --- Constants & Config ---
const CONFIG_KEY = 'attendance_config';
const DATA_KEY = 'attendance_data';
const HOLIDAYS_KEY = 'attendance_holidays';
const PROFILE_KEY = 'attendance_profile';
const ACADEMIC_START = new Date('2026-01-05T00:00:00');
const ACADEMIC_END = new Date('2026-07-31T23:59:59');

// Timetable Structure
// Days: 0=Sun, 1=Mon, ..., 6=Sat
// Type: 'fixed' | 'elective_it' | 'elective_ssdx' | 'batch' | 'break'
const TIMETABLE = {
    1: [ // Monday
        { time: "09:00 - 09:50", type: "fixed", name: "ITD 3201" },
        { time: "09:50 - 10:40", type: "elective_it", group: ["ITDX 45", "ITDX 11"] },
        { time: "10:40 - 11:00", type: "break", name: "Tea Break" },
        { time: "11:00 - 11:50", type: "elective_ssdx" }, // All SSDX
        { time: "11:50 - 12:40", type: "elective_it", group: ["ITDX 42", "ITDX 29"] },
        { time: "12:40 - 01:40", type: "break", name: "Lunch Break" },
        // Split 3 periods
        { time: "01:40 - 02:30", type: "batch", batch1: "MSD 3181", batch2: "ITD 3203 (Lab)" },
        { time: "02:30 - 03:20", type: "batch", batch1: "MSD 3181", batch2: "ITD 3203 (Lab)" },
        { time: "03:20 - 04:10", type: "batch", batch1: "MSD 3181", batch2: "ITD 3203 (Lab)" }
    ],
    2: [ // Tuesday
        { time: "09:00 - 09:50", type: "elective_it", group: ["ITDX 45", "ITDX 11"] },
        { time: "09:50 - 10:40", type: "fixed", name: "ITD 3201" },
        { time: "10:40 - 11:00", type: "break", name: "Tea Break" },
        // Split 2 periods
        { time: "11:00 - 11:50", type: "fixed", name: "GEDX 209" },
        { time: "11:50 - 12:40", type: "fixed", name: "GEDX 209" },
        { time: "12:40 - 01:40", type: "break", name: "Lunch Break" },
        { time: "01:40 - 02:30", type: "elective_it", group: ["ITDX 42", "ITDX 29"] },
        { time: "02:30 - 03:20", type: "fixed", name: "ITD 3202" },
        { time: "03:20 - 04:10", type: "fixed", name: "Seminar" }
    ],
    3: [ // Wednesday
        { time: "09:00 - 09:50", type: "elective_it", group: ["ITDX 42", "ITDX 29"] },
        // Split 3 periods (1 morning + 2 late morning)
        { time: "09:50 - 10:40", type: "batch", batch1: "ITD 3203 (Lab)", batch2: "MSD 3181" },
        { time: "10:40 - 11:00", type: "break", name: "Tea Break" },
        { time: "11:00 - 11:50", type: "batch", batch1: "ITD 3203 (Lab)", batch2: "MSD 3181" },
        { time: "11:50 - 12:40", type: "batch", batch1: "ITD 3203 (Lab)", batch2: "MSD 3181" },
        { time: "12:40 - 01:40", type: "break", name: "Lunch Break" },
        { time: "01:40 - 02:30", type: "elective_it", group: ["ITDX 45", "ITDX 11"] },
        { time: "02:30 - 03:20", type: "fixed", name: "ITD 3201" },
        { time: "03:20 - 04:10", type: "fixed", name: "ITD 3202" }
    ],
    4: [ // Thursday
        { time: "09:00 - 09:50", type: "elective_ssdx" },
        { time: "09:50 - 10:40", type: "elective_it", group: ["ITDX 45", "ITDX 11"] },
        { time: "10:40 - 11:00", type: "break", name: "Tea Break" },
        { time: "11:00 - 12:40", type: "elective_it", group: ["ITDX 42", "ITDX 29"] },
        { time: "12:40 - 01:40", type: "break", name: "Lunch Break" },
        // Split 2 periods
        { time: "01:40 - 02:30", type: "fixed", name: "GEDX 209" },
        { time: "02:30 - 03:20", type: "fixed", name: "GEDX 209" },
        { time: "03:20 - 04:10", type: "fixed", name: "Seminar" }
    ],
    5: [ // Friday
        { time: "09:00 - 09:50", type: "fixed", name: "ITD 3202" },
        { time: "09:50 - 10:40", type: "fixed", name: "Seminar" },
        { time: "10:40 - 11:00", type: "break", name: "Tea Break" },
        // Split 2 periods
        { time: "11:00 - 11:50", type: "fixed", name: "GED 3201" },
        { time: "11:50 - 12:40", type: "fixed", name: "GED 3201" },
        { time: "12:40 - 01:40", type: "break", name: "Lunch Break" },
        { time: "01:40 - 02:30", type: "break", name: "Prayer" },
        { time: "02:30 - 03:20", type: "fixed", name: "ITD 3202" },
        { time: "03:20 - 04:10", type: "fixed", name: "ITD 3201" }
    ]
};

// --- State ---
let userConfig = null;
let attendanceData = {}; // { "2023-10-27": { "Subject Name": "P"|"A" } }
let holidaysData = {}; // { "2023-10-27": true }
let profileData = { name: '', avatar: null };
let selectedDate = new Date();
let viewingMonth = new Date();

// --- DOM Elements ---
const screens = {
    setup: document.getElementById('setup-screen'),
    app: document.getElementById('app-screen')
};
const setupForm = document.getElementById('setup-form');
const dateScroll = document.getElementById('date-scroll');
const subjectsContainer = document.getElementById('subjects-container');
const monthDisplay = document.getElementById('month-display');
const prevMonthBtn = document.getElementById('prev-month');
const nextMonthBtn = document.getElementById('next-month');
const resetBtn = document.getElementById('reset-btn');
const overallPercentage = document.getElementById('overall-percentage');
const overallChartLine = document.querySelector('.circular-chart');

const subjectStatsList = document.getElementById('subject-stats-list');

// Profile Elements
const profileTrigger = document.getElementById('profile-trigger');
const profileDrawer = document.getElementById('profile-drawer');
const profileOverlay = document.getElementById('profile-overlay');
const closeProfileBtn = document.getElementById('close-profile');
const avatarInput = document.getElementById('avatar-input');
const avatarPreview = document.getElementById('avatar-preview');
const profileNameInput = document.getElementById('profile-name');
const saveProfileBtn = document.getElementById('save-profile-btn');
const headerRight = document.querySelector('.header-right');

// --- Initialization ---
function init() {
    loadData();
    // Always render profile UI regardless of config state
    renderProfileUI();

    if (userConfig) {
        showApp();
    } else {
        showSetup();
    }
}

function loadData() {
    const config = localStorage.getItem(CONFIG_KEY);
    if (config) {
        userConfig = JSON.parse(config);
        // Safety check: specific for the new IT elective split update
        // If old config (has 'it_elective') or missing new fields, reset to force setup.
        if (userConfig.it_elective || !userConfig.it_elective_a || !userConfig.it_elective_b) {
            console.log("Migrating/Resetting config for new update");
            userConfig = null;
            localStorage.removeItem(CONFIG_KEY);
        }
    }

    const data = localStorage.getItem(DATA_KEY);
    if (data) attendanceData = JSON.parse(data);

    const holidays = localStorage.getItem(HOLIDAYS_KEY);
    if (holidays) holidaysData = JSON.parse(holidays);

    const profile = localStorage.getItem(PROFILE_KEY);
    if (profile) profileData = JSON.parse(profile);
}

function saveData() {
    localStorage.setItem(DATA_KEY, JSON.stringify(attendanceData));
    localStorage.setItem(HOLIDAYS_KEY, JSON.stringify(holidaysData));
}

// --- Navigation ---
function showSetup() {
    screens.setup.classList.remove('hidden');
    screens.app.classList.add('hidden');
}



// --- Setup Form Handlers ---
setupForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const formData = new FormData(setupForm);
    userConfig = {
        it_elective_a: formData.get('it_elective_a'),
        it_elective_b: formData.get('it_elective_b'),
        ssdx_elective: formData.get('ssdx_elective'),
        batch: formData.get('batch')
    };
    localStorage.setItem(CONFIG_KEY, JSON.stringify(userConfig));
    showApp();
});

resetBtn.addEventListener('click', () => {
    if (confirm("Are you sure you want to reset your setup? This won't delete attendance data.")) {
        localStorage.removeItem(CONFIG_KEY);
        userConfig = null;
        location.reload();
    }
});

// --- Profile Logic ---
profileTrigger.addEventListener('click', openProfile);
closeProfileBtn.addEventListener('click', closeProfile);
profileOverlay.addEventListener('click', closeProfile);
saveProfileBtn.addEventListener('click', saveProfile);

avatarInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            renderAvatarPreview(e.target.result);
        };
        reader.readAsDataURL(file);
    }
});

function openProfile() {
    profileDrawer.classList.add('active');
    profileOverlay.classList.remove('hidden');
    setTimeout(() => profileOverlay.classList.add('active'), 10);

    // Set inputs
    profileNameInput.value = profileData.name || '';
    renderAvatarPreview(profileData.avatar);
}

function closeProfile() {
    profileDrawer.classList.remove('active');
    profileOverlay.classList.remove('active');
    setTimeout(() => {
        profileOverlay.classList.add('hidden');
    }, 300);
}

function saveProfile() {
    const newName = profileNameInput.value.trim();
    // Get image source from preview div
    const imgInfo = avatarPreview.querySelector('img');
    const newAvatar = imgInfo ? imgInfo.src : null;

    // Check if it's the default placeholder (we store null if default)
    // Actually we can just store the base64 string

    profileData = {
        name: newName,
        avatar: newAvatar
    };

    localStorage.setItem(PROFILE_KEY, JSON.stringify(profileData));
    renderProfileUI();
    closeProfile();
}

function renderProfileUI() {
    // Header Avatar
    const avatarSrc = profileData.avatar;
    const initial = profileData.name ? profileData.name.charAt(0).toUpperCase() : 'U';

    // Helper to generate Avatar HTML
    const getAvatarHTML = (src, size) => {
        if (src && src.startsWith('data:image')) {
            return `<img src="${src}" alt="Profile">`;
        }
        return `<div class="default-avatar" style="font-size: ${size === 'large' ? '2rem' : '1rem'}">${initial}</div>`;
    };

    profileTrigger.innerHTML = getAvatarHTML(avatarSrc, 'small');
}

function renderAvatarPreview(src) {
    const initial = profileNameInput.value ? profileNameInput.value.charAt(0).toUpperCase() : (profileData.name ? profileData.name.charAt(0).toUpperCase() : 'U');

    if (src && src.startsWith('data:image')) {
        avatarPreview.innerHTML = `<img src="${src}" alt="Preview">`;
    } else {
        avatarPreview.innerHTML = `<div class="default-avatar" style="font-size: 2.5rem; width: 100%; height: 100%;">${initial}</div>`;
    }
}

// --- Date Picker Logic ---

// Determine initial viewing date
function getInitialSafeDate() {
    const now = new Date();
    // Normalize time
    now.setHours(0, 0, 0, 0);

    if (now >= ACADEMIC_START && now <= ACADEMIC_END) {
        return now;
    }
    return new Date(ACADEMIC_START);
}

function showApp() {
    screens.setup.classList.add('hidden');
    screens.app.classList.remove('hidden');

    // Set initial state
    const safeDate = getInitialSafeDate();
    viewingMonth = new Date(safeDate);
    // Don't modify time components of viewingMonth to avoid timezone shifts when getting month
    viewingMonth.setDate(1);

    renderDateScroll(viewingMonth);
    selectDate(safeDate);
    updateStats();
}

prevMonthBtn.addEventListener('click', () => {
    const prev = new Date(viewingMonth);
    prev.setMonth(prev.getMonth() - 1);

    // Check if we went too far back (before Jan 2026)
    // We compare Year/Month
    if (prev < new Date(ACADEMIC_START.getFullYear(), ACADEMIC_START.getMonth(), 1)) return;

    viewingMonth = prev;
    renderDateScroll(viewingMonth);
});

nextMonthBtn.addEventListener('click', () => {
    const next = new Date(viewingMonth);
    next.setMonth(next.getMonth() + 1);

    // Check if we went too far forward (after July 2026)
    if (next > new Date(ACADEMIC_END.getFullYear(), ACADEMIC_END.getMonth(), 1)) return;

    viewingMonth = next;
    renderDateScroll(viewingMonth);
});

function renderDateScroll(monthDate) {
    dateScroll.innerHTML = '';
    const currentMonth = monthDate.getMonth();
    const currentYear = monthDate.getFullYear();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    monthDisplay.textContent = monthDate.toLocaleString('default', { month: 'long', year: 'numeric' });

    for (let i = 1; i <= daysInMonth; i++) {
        const date = new Date(currentYear, currentMonth, i);

        // STRICT DATE FILTERING
        // Ignore if before start or after end
        if (date < ACADEMIC_START || date > ACADEMIC_END) {
            continue;
        }

        const dayName = date.toLocaleString('default', { weekday: 'short' });

        const card = document.createElement('div');
        card.className = 'date-card';

        // Highlight if matches selectedDate
        if (date.toDateString() === selectedDate.toDateString()) {
            card.classList.add('selected');
        }

        card.innerHTML = `
            <span class="date-day">${dayName}</span>
            <span class="date-num">${i}</span>
        `;

        card.addEventListener('click', () => {
            document.querySelectorAll('.date-card').forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
            selectDate(date);
        });

        dateScroll.appendChild(card);
    }

    // Scroll to selected if it exists in this view
    setTimeout(() => {
        const selected = dateScroll.querySelector('.selected');
        if (selected) selected.scrollIntoView({ behavior: 'smooth', inline: 'center' });
    }, 100);
}

function selectDate(date) {
    selectedDate = date;
    const dayOfWeek = date.getDay(); // 0-6
    renderSubjects(dayOfWeek, date);
}

// --- Subject Rendering ---
function renderSubjects(dayOfWeek, dateObj) {
    subjectsContainer.innerHTML = '';
    const dateKey = formatDateKey(dateObj);

    // HOLIDAY CHECK
    if (holidaysData[dateKey]) {
        subjectsContainer.innerHTML = `
            <div class="empty-state holiday-msg">
                <h3>Official Holiday 🎉</h3>
                <p>No classes today</p>
            </div>
        `;
        appendHolidayButton(dateKey, true);
        return;
    }

    if (dayOfWeek === 0 || dayOfWeek === 6 || !TIMETABLE[dayOfWeek]) {
        subjectsContainer.innerHTML = '<div class="empty-state">No classes today! 🎉</div>';
        appendHolidayButton(dateKey, false);
        return;
    }

    const slots = TIMETABLE[dayOfWeek];

    slots.forEach(slot => {
        // Logic to determine if we show this slot
        let subjectName = null;

        if (slot.type === 'break') {
            subjectName = slot.name;
        } else if (slot.type === 'fixed') {
            subjectName = slot.name;
        } else if (slot.type === 'elective_it') {
            if (slot.group.includes(userConfig.it_elective_a)) {
                subjectName = userConfig.it_elective_a;
            } else if (slot.group.includes(userConfig.it_elective_b)) {
                subjectName = userConfig.it_elective_b;
            }
        } else if (slot.type === 'elective_ssdx') {
            subjectName = userConfig.ssdx_elective;
        } else if (slot.type === 'batch') {
            subjectName = (userConfig.batch === "1") ? slot.batch1 : slot.batch2;
        }

        if (subjectName) {
            createSubjectCard(slot.time, subjectName, slot.type, dateKey);
        }
    });

    appendHolidayButton(dateKey, false);
}

function appendHolidayButton(dateKey, isHoliday) {
    const btn = document.createElement('button');
    btn.className = isHoliday ? 'btn-holiday remove' : 'btn-holiday add';
    btn.textContent = isHoliday ? 'Undo "Official Holiday"' : 'Mark as Holiday';
    btn.onclick = () => toggleHoliday(dateKey);
    subjectsContainer.appendChild(btn);
}

function toggleHoliday(dateKey) {
    if (holidaysData[dateKey]) {
        delete holidaysData[dateKey];
    } else {
        holidaysData[dateKey] = true;
    }
    saveData();
    // Re-render only current view
    selectDate(selectedDate);
}

function createSubjectCard(time, name, type, dateKey) {
    if (type === 'break') {
        const div = document.createElement('div');
        div.className = 'break-card';
        div.textContent = `${time} • ${name}`;
        subjectsContainer.appendChild(div);
        return;
    }

    const card = document.createElement('div');
    card.className = 'subject-card';

    // Generate unique ID for storage (Name + Time)
    // We replace spaces/special chars in time to make a clean key suffix
    const uniqueKey = `${name} [${time}]`;
    const record = attendanceData[dateKey]?.[uniqueKey];

    card.innerHTML = `
        <div class="subject-header">
            <div>
                <span class="subject-time">${time}</span>
                <h3 class="subject-name">${name}</h3>
                <span class="subject-type">${type.includes('elective') ? 'Elective' : 'Core'} Subject</span>
            </div>
        </div>
        <div class="attendance-actions">
            <button class="btn-action btn-present ${record === 'P' ? 'active' : ''}" onclick="mark('${dateKey}', '${uniqueKey}', 'P')">Present</button>
            <button class="btn-action btn-absent ${record === 'A' ? 'active' : ''}" onclick="mark('${dateKey}', '${uniqueKey}', 'A')">Absent</button>
        </div>
    `;
    subjectsContainer.appendChild(card);
}

// --- Mark Attendance ---
window.mark = function (dateKey, storageKey, status) {
    if (!attendanceData[dateKey]) attendanceData[dateKey] = {};

    if (attendanceData[dateKey][storageKey] === status) {
        delete attendanceData[dateKey][storageKey];
    } else {
        attendanceData[dateKey][storageKey] = status;
    }

    saveData();
    selectDate(selectedDate);
    updateStats();
};

function formatDateKey(date) {
    return date.toISOString().split('T')[0];
}

// --- Stats Logic ---
function updateStats() {
    let totalClasses = 0;
    let totalPresent = 0;
    const subjectCounts = {}; // { name: {total, present} }

    Object.keys(attendanceData).forEach(date => {
        Object.keys(attendanceData[date]).forEach(key => {
            const status = attendanceData[date][key];

            // Extract clean Name from "Name [Time]"
            // If key has " [", split it. Otherwise (legacy data), use key as is.
            const cleanName = key.includes(' [') ? key.substring(0, key.lastIndexOf(' [')) : key;

            if (!subjectCounts[cleanName]) subjectCounts[cleanName] = { total: 0, present: 0 };

            subjectCounts[cleanName].total++;
            if (status === 'P') {
                subjectCounts[cleanName].present++;
                totalPresent++;
            }
            totalClasses++;
        });
    });

    // Overall
    const pct = totalClasses === 0 ? 0 : Math.round((totalPresent / totalClasses) * 100);
    overallPercentage.textContent = `${pct}%`;
    overallChartLine.style.setProperty('--pct', `${pct}%`);

    // Per Subject
    subjectStatsList.innerHTML = '';
    Object.keys(subjectCounts).forEach(subj => {
        const s = subjectCounts[subj];
        const sPct = Math.round((s.present / s.total) * 100);

        const row = document.createElement('div');
        row.className = 'stat-row';
        row.innerHTML = `
            <span>${subj}</span>
            <span style="color: ${sPct < 75 ? 'var(--danger)' : 'var(--success)'}">${sPct}% (${s.present}/${s.total})</span>
        `;
        subjectStatsList.appendChild(row);
    });
}

// Start
init();
