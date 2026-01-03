/**
 * Student Attendance PWA Logic
 */

// --- Constants & Config ---
const CONFIG_KEY = 'attendance_config';
const DATA_KEY = 'attendance_data';

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
        { time: "01:40 - 04:10", type: "batch", batch1: "MSD 3181", batch2: "ITD 3203 (Lab)" }
    ],
    2: [ // Tuesday
        { time: "09:00 - 09:50", type: "elective_it", group: ["ITDX 45", "ITDX 11"] },
        { time: "09:50 - 10:40", type: "fixed", name: "ITD 3201" },
        { time: "10:40 - 11:00", type: "break", name: "Tea Break" },
        { time: "11:00 - 12:40", type: "fixed", name: "GEDX 209" },
        { time: "12:40 - 01:40", type: "break", name: "Lunch Break" },
        { time: "01:40 - 02:30", type: "elective_it", group: ["ITDX 42", "ITDX 29"] },
        { time: "02:30 - 03:20", type: "fixed", name: "ITD 3202" },
        { time: "03:20 - 04:10", type: "fixed", name: "Seminar" }
    ],
    3: [ // Wednesday
        { time: "09:00 - 09:50", type: "elective_it", group: ["ITDX 42", "ITDX 29"] },
        { time: "09:50 - 10:40", type: "batch", batch1: "ITD 3203 (Lab)", batch2: "MSD 3181" },
        { time: "10:40 - 11:00", type: "break", name: "Tea Break" },
        { time: "11:00 - 12:40", type: "batch", batch1: "ITD 3203 (Lab)", batch2: "MSD 3181" },
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
        { time: "01:40 - 03:20", type: "fixed", name: "GEDX 209" },
        { time: "03:20 - 04:10", type: "fixed", name: "Seminar" }
    ],
    5: [ // Friday
        { time: "09:00 - 09:50", type: "fixed", name: "ITD 3202" },
        { time: "09:50 - 10:40", type: "fixed", name: "Seminar" },
        { time: "10:40 - 11:00", type: "break", name: "Tea Break" },
        { time: "11:00 - 12:40", type: "fixed", name: "GED 3201" },
        { time: "12:40 - 01:40", type: "break", name: "Lunch Break" },
        { time: "01:40 - 02:30", type: "break", name: "Prayer" },
        { time: "02:30 - 03:20", type: "fixed", name: "ITD 3202" },
        { time: "03:20 - 04:10", type: "fixed", name: "ITD 3201" }
    ]
};

// --- State ---
let userConfig = null;
let attendanceData = {}; // { "2023-10-27": { "Subject Name": "P"|"A" } }
let selectedDate = new Date();

// --- DOM Elements ---
const screens = {
    setup: document.getElementById('setup-screen'),
    app: document.getElementById('app-screen')
};
const setupForm = document.getElementById('setup-form');
const dateScroll = document.getElementById('date-scroll');
const subjectsContainer = document.getElementById('subjects-container');
const monthDisplay = document.getElementById('month-display');
const resetBtn = document.getElementById('reset-btn');
const overallPercentage = document.getElementById('overall-percentage');
const overallChartLine = document.querySelector('.circular-chart');
const subjectStatsList = document.getElementById('subject-stats-list');

// --- Initialization ---
function init() {
    loadData();
    if (userConfig) {
        showApp();
    } else {
        showSetup();
    }
}

function loadData() {
    const config = localStorage.getItem(CONFIG_KEY);
    if (config) userConfig = JSON.parse(config);

    const data = localStorage.getItem(DATA_KEY);
    if (data) attendanceData = JSON.parse(data);
}

function saveData() {
    localStorage.setItem(DATA_KEY, JSON.stringify(attendanceData));
}

// --- Navigation ---
function showSetup() {
    screens.setup.classList.remove('hidden');
    screens.app.classList.add('hidden');
}

function showApp() {
    screens.setup.classList.add('hidden');
    screens.app.classList.remove('hidden');
    renderDateScroll();
    selectDate(new Date());
    updateStats();
}

// --- Setup Form Handlers ---
setupForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const formData = new FormData(setupForm);
    userConfig = {
        it_elective: formData.get('it_elective'),
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

// --- Date Picker Logic ---
function renderDateScroll() {
    dateScroll.innerHTML = '';
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    monthDisplay.textContent = today.toLocaleString('default', { month: 'long', year: 'numeric' });

    for (let i = 1; i <= daysInMonth; i++) {
        const date = new Date(currentYear, currentMonth, i);
        const dayName = date.toLocaleString('default', { weekday: 'short' });
        
        const card = document.createElement('div');
        card.className = 'date-card';
        if (i === today.getDate()) card.classList.add('selected');
        
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
    
    // Scroll to today
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

    if (dayOfWeek === 0 || dayOfWeek === 6 || !TIMETABLE[dayOfWeek]) {
        subjectsContainer.innerHTML = '<div class="empty-state">No classes today! 🎉</div>';
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
            if (slot.group.includes(userConfig.it_elective)) {
                subjectName = userConfig.it_elective;
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
    
    // Check attendance state
    const record = attendanceData[dateKey]?.[name]; // 'P' or 'A' or undefined

    card.innerHTML = `
        <div class="subject-header">
            <div>
                <span class="subject-time">${time}</span>
                <h3 class="subject-name">${name}</h3>
                <span class="subject-type">${type.includes('elective') ? 'Elective' : 'Core'} Subject</span>
            </div>
        </div>
        <div class="attendance-actions">
            <button class="btn-action btn-present ${record === 'P' ? 'active' : ''}" onclick="mark('${dateKey}', '${name}', 'P')">Present</button>
            <button class="btn-action btn-absent ${record === 'A' ? 'active' : ''}" onclick="mark('${dateKey}', '${name}', 'A')">Absent</button>
        </div>
    `;
    subjectsContainer.appendChild(card);
}

// --- Mark Attendance ---
window.mark = function(dateKey, subject, status) {
    if (!attendanceData[dateKey]) attendanceData[dateKey] = {};
    
    // Toggle logic: If clicking same status, remove it
    if (attendanceData[dateKey][subject] === status) {
        delete attendanceData[dateKey][subject];
    } else {
        attendanceData[dateKey][subject] = status;
    }
    
    saveData();
    selectDate(selectedDate); // Re-render to update UI state
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
        Object.keys(attendanceData[date]).forEach(subj => {
            const status = attendanceData[date][subj];
            
            if (!subjectCounts[subj]) subjectCounts[subj] = { total: 0, present: 0 };
            
            subjectCounts[subj].total++;
            if (status === 'P') {
                subjectCounts[subj].present++;
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
