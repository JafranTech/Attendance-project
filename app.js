/**
 * Student Attendance PWA Logic
 */

// --- Constants & Config ---
const CONFIG_KEY = 'attendance_config';
const DATA_KEY = 'attendance_data';
const HOLIDAYS_KEY = 'attendance_holidays';
const PROFILE_KEY = 'attendance_profile';
const THEME_KEY = 'attendance_theme';
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
        { time: "01:40 - 02:30", type: "batch", batch1: "ITD 3203 (Lab)", batch2: "MSD 3181" },
        { time: "02:30 - 03:20", type: "batch", batch1: "ITD 3203 (Lab)", batch2: "MSD 3181" },
        { time: "03:20 - 04:10", type: "batch", batch1: "ITD 3203 (Lab)", batch2: "MSD 3181" }
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
        { time: "09:50 - 10:40", type: "batch", batch1: "MSD 3181", batch2: "ITD 3203" },
        { time: "10:40 - 11:00", type: "break", name: "Tea Break" },
        { time: "11:00 - 11:50", type: "batch", batch1: "MSD 3181", batch2: "ITD 3203" },
        { time: "11:50 - 12:40", type: "batch", batch1: "MSD 3181", batch2: "ITD 3203" },
        { time: "12:40 - 01:40", type: "break", name: "Lunch Break" },
        { time: "01:40 - 02:30", type: "elective_it", group: ["ITDX 45", "ITDX 11"] },
        { time: "02:30 - 03:20", type: "fixed", name: "ITD 3201" },
        { time: "03:20 - 04:10", type: "fixed", name: "ITD 3202" }
    ],
    4: [ // Thursday
        { time: "09:00 - 09:50", type: "elective_ssdx" },
        { time: "09:50 - 10:40", type: "elective_it", group: ["ITDX 45", "ITDX 11"] },
        { time: "10:40 - 11:00", type: "break", name: "Tea Break" },
        { time: "11:00 - 11:50", type: "elective_it", group: ["ITDX 42", "ITDX 29"] },
        { time: "11:50 - 12:40", type: "elective_it", group: ["ITDX 42", "ITDX 29"] },
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

const BIO_TIMETABLE = {
    1: [ // Monday
        { time: "09:00 - 09:50", type: "fixed", name: "BTD3202" },
        { time: "09:50 - 10:40", type: "fixed", name: "BTD3202" },
        { time: "11:00 - 11:50", type: "elective_bio" },
        { time: "11:50 - 12:40", type: "elective_bio" },
        { time: "12:40 - 01:40", type: "break", name: "Lunch Break" },
        { time: "01:40 - 02:30", type: "fixed", name: "BTD3203" },
        { time: "02:30 - 03:20", type: "fixed", name: "PBL" },
        { time: "03:20 - 04:10", type: "fixed", name: "BTDX36" }
    ],
    2: [ // Tuesday
        { time: "09:00 - 09:50", type: "fixed", name: "BTD3201" },
        { time: "09:50 - 10:40", type: "fixed", name: "BTD3202" },
        { time: "10:40 - 11:00", type: "break", name: "Tea Break" },
        { time: "11:00 - 11:50", type: "elective_open" },
        { time: "11:50 - 12:40", type: "elective_open" },
        { time: "12:40 - 01:40", type: "break", name: "Lunch Break" },
        { time: "01:40 - 02:30", type: "fixed", name: "MSD3181" },
        { time: "02:30 - 03:20", type: "fixed", name: "BTDX36" },
        { time: "03:20 - 04:10", type: "fixed", name: "BTD3203" }
    ],
    3: [ // Wednesday
        { time: "09:00 - 09:50", type: "fixed", name: "BTD3201" },
        { time: "09:50 - 10:40", type: "fixed", name: "BTD3201" },
        { time: "10:40 - 11:00", type: "break", name: "Tea Break" },
        { time: "11:00 - 11:50", type: "fixed", name: "PBL" },
        { time: "11:50 - 12:40", type: "fixed", name: "BTD3202" },
        { time: "12:40 - 01:40", type: "break", name: "Lunch Break" },
        { time: "01:40 - 02:30", type: "elective_ssdx" },
        { time: "02:30 - 03:20", type: "fixed", name: "MSD3181" },
        { time: "03:20 - 04:10", type: "fixed", name: "PBL" }
    ],
    4: [ // Thursday
        { time: "09:00 - 09:50", type: "fixed", name: "GED3201" },
        { time: "09:50 - 10:40", type: "fixed", name: "GED3201" },
        { time: "10:40 - 11:00", type: "break", name: "Tea Break" },
        { time: "11:00 - 11:50", type: "elective_ssdx" },
        { time: "11:50 - 12:40", type: "elective_bio" },
        { time: "12:40 - 01:40", type: "break", name: "Lunch Break" },
        { time: "01:40 - 02:30", type: "elective_open" },
        { time: "02:30 - 03:20", type: "elective_open" },
        { time: "03:20 - 04:10", type: "fixed", name: "BTDX36" }
    ],
    5: [ // Friday
        { time: "09:00 - 09:50", type: "batch", batch1: "BTD3202", batch2: "BTD3203" },
        { time: "09:50 - 10:40", type: "batch", batch1: "BTD3202", batch2: "BTD3203" },
        { time: "10:40 - 11:00", type: "break", name: "Tea Break" },
        { time: "11:00 - 11:50", type: "batch", batch1: "BTD3202", batch2: "BTD3203" },
        { time: "11:50 - 12:40", type: "batch", batch1: "BTD3202", batch2: "BTD3203" },
        { time: "12:40 - 01:40", type: "break", name: "Lunch Break" },
        { time: "01:40 - 02:30", type: "break", name: "Prayer" },
        { time: "02:30 - 03:20", type: "fixed", name: "PBL" },
        { time: "03:20 - 04:10", type: "fixed", name: "MSD3181" }
    ]
};

// Subject Name Lookup (IT Department)
const SUBJECT_NAMES = {
    "ITD 3201": "Software Testing",
    "ITD 3202": "Cloud Computing Technologies",
    "ITD 3203": "Software Development Lab",
    "ITDX 45": "Big Data Analytics",
    "ITDX 11": "Introduction to DevOps",
    "ITDX 42": "Programming in R",
    "ITDX 29": "Industry 4.0 and IIoT",
    "SSDX 11": "Economics of Sustainable Development",
    "SSDX 12": "Sociology of Industrial Relations",
    "SSDX 13": "Professional Ethics and Human Values",
    "SSDX 14": "Gender, Technology and Development",
    "GEDX 209": "Disaster Management",
    "GED 3201": "Reasoning and Aptitude",
    "MSD 3181": "Fundamentals of Entrepreneurship",
    "Seminar": "Seminar",
    // Biotech Subjects
    "BTD3201": "Nanobiotechnology",
    "BTD3202": "Food Biotechnology",
    "BTD3203": "Fermentation Technology and Bioreactor Design",
    "BTDX31": "Intellectual Property Rights",
    "BTDX37": "Stem Cell Technology",
    "BTDX36": "Waste Management and Upcycling",
    "MSD3181": "Fundamentals of Entrepreneurship",
    "GED3201": "Reasoning and Aptitude",
    "PBL": "Project Based Learning",
    "GEDX 207": "Cyber Forensics",
    "GEDX 208": "Cyber Security",
    "GEDX 112": "Electric Vehicle"
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
    dept: document.getElementById('department-screen'),
    setup: document.getElementById('setup-screen'),
    setupBio: document.getElementById('setup-screen-bio'),
    app: document.getElementById('app-screen'),
    notes: document.getElementById('notes-screen'),
    history: document.getElementById('history-screen')
};

// Forms & Setup
const deptForm = document.getElementById('department-form');
const setupForm = document.getElementById('setup-form');
const setupBioForm = document.getElementById('setup-form-bio');
const resetBtn = document.getElementById('reset-btn');

// Main App Navigation
const dateScroll = document.getElementById('date-scroll');
const subjectsContainer = document.getElementById('subjects-container');
const monthDisplay = document.getElementById('month-display');
const prevMonthBtn = document.getElementById('prev-month');
const nextMonthBtn = document.getElementById('next-month');

// Statistics
const overallPercentage = document.getElementById('overall-percentage');
const overallChartLine = document.querySelector('.circular-chart');
const subjectStatsList = document.getElementById('subject-stats-list');
const overallProgressSection = document.querySelector('.overall-progress');

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
const themeToggle = document.getElementById('theme-toggle');

// Notes Elements
const notesTrigger = document.getElementById('notes-trigger');
const notesSubjectSelect = document.getElementById('notes-subject-select');
const notesArea = document.getElementById('notes-area');
const notesStatus = document.getElementById('notes-status');
const backFromNotesBtn = document.getElementById('back-from-notes');

// History Elements
const backFromHistoryBtn = document.getElementById('back-from-history');
const historyList = document.getElementById('history-list');
const filterBtns = document.querySelectorAll('.filter-btn');

const NOTES_KEY = 'attendance_notes';
let notesData = {}; // { "Subject Name": "note content" }

const SATURDAY_KEY = 'attendance_saturday_map';
let saturdayData = {}; // { "2026-05-16": 1 (Monday) }

// Saturday Elements
const saturdayModal = document.getElementById('saturday-modal');

let selectedHistorySubject = null; // State for drilldown

// --- Initialization ---
function init() {
    loadData();
    loadTheme();
    // Always render profile UI regardless of config state
    renderProfileUI();

    if (userConfig) {
        showApp();
    } else {
        checkDepartment();
    }
}

function checkDepartment() {
    const dept = localStorage.getItem('department');
    if (!dept) {
        showDeptSelection();
    } else if (dept === 'BIO') {
        showSetupBio();
    } else {
        // Default to IT if dept is IT or unknown (but valid enough to not be null)
        // However, user requested strict flow. 
        // If dept exists but is not BIO, we assume IT for now or check explicitly.
        // Let's be explicit:
        if (dept === 'IT') {
            showSetup();
        } else {
            // Invalid dept key found? Reset and show selection
            localStorage.removeItem('department');
            showDeptSelection();
        }
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
            // Also reset department to force correct flow
            localStorage.removeItem('department');
        }
    }

    const data = localStorage.getItem(DATA_KEY);
    if (data) attendanceData = JSON.parse(data);

    const holidays = localStorage.getItem(HOLIDAYS_KEY);
    if (holidays) holidaysData = JSON.parse(holidays);

    const profile = localStorage.getItem(PROFILE_KEY);
    if (profile) profileData = JSON.parse(profile);

    const notes = localStorage.getItem(NOTES_KEY);
    if (notes) notesData = JSON.parse(notes);

    const satMap = localStorage.getItem(SATURDAY_KEY);
    if (satMap) saturdayData = JSON.parse(satMap);
}

function saveData() {
    localStorage.setItem(DATA_KEY, JSON.stringify(attendanceData));
    localStorage.setItem(HOLIDAYS_KEY, JSON.stringify(holidaysData));
    localStorage.setItem(SATURDAY_KEY, JSON.stringify(saturdayData));
}

// --- Theme Logic ---
function loadTheme() {
    const theme = localStorage.getItem(THEME_KEY);
    if (theme === 'dark') {
        document.body.classList.add('dark-mode');
        themeToggle.textContent = '☀️';
    } else {
        document.body.classList.remove('dark-mode');
        themeToggle.textContent = '🌙';
    }
}

themeToggle.addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');

    // Update Icon
    themeToggle.textContent = isDark ? '☀️' : '🌙';

    // Save Persistence
    localStorage.setItem(THEME_KEY, isDark ? 'dark' : 'light');
});

// --- Navigation ---
// --- Navigation ---
function showDeptSelection() {
    screens.dept.classList.remove('hidden');
    screens.setup.classList.add('hidden');
    screens.setupBio.classList.add('hidden');
    screens.app.classList.add('hidden');
    screens.notes.classList.add('hidden');
    screens.history.classList.add('hidden');
}

function showSetup() {
    screens.dept.classList.add('hidden');
    screens.setup.classList.remove('hidden');
    screens.setupBio.classList.add('hidden');
    screens.app.classList.add('hidden');
    screens.notes.classList.add('hidden');
    screens.history.classList.add('hidden');
}

function showSetupBio() {
    screens.dept.classList.add('hidden');
    screens.setup.classList.add('hidden');
    screens.setupBio.classList.remove('hidden');
    screens.app.classList.add('hidden');
    screens.notes.classList.add('hidden');
    screens.history.classList.add('hidden');
}

function showNotes() {
    screens.app.classList.add('hidden');
    screens.notes.classList.remove('hidden');
    populateNotesDropdown();
}

function showHistory(subject = null) {
    selectedHistorySubject = subject;
    screens.app.classList.add('hidden');
    screens.history.classList.remove('hidden');

    // Update Header Title
    const headerTitle = screens.history.querySelector('h1');
    if (subject) {
        // Look up full name
        const fullName = SUBJECT_NAMES[subject] || "";
        // If name exists, show Code (Name). Else just Code.
        // Actually user wants: "Attendance History – ITD 3201 (Software Testing)"
        // But the h1 is usually "History" or subject code in previous step.
        // Let's make it concise: Code (below name in list anyway).
        // User requested: "Attendance History – ITD 3201 (Software Testing)"
        // That might be too long for mobile header. 
        // Let's try:
        headerTitle.innerHTML = `<span style="display:block; font-size: 1.1rem; font-weight: 700;">${subject}</span><span style="display:block; font-size: 0.8rem; font-weight: 400; opacity: 0.8;">${fullName}</span>`;
    } else {
        headerTitle.textContent = "Attendance History";
        headerTitle.style.fontSize = "";
    }

    renderHistoryList('all');
}



// --- Setup Form Handlers ---
// --- Setup Form Handlers ---
deptForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const formData = new FormData(deptForm);
    const dept = formData.get('dept');
    localStorage.setItem('department', dept);
    checkDepartment();
});

setupForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const formData = new FormData(setupForm);
    userConfig = {
        dept: 'IT',
        it_elective_a: formData.get('it_elective_a'),
        it_elective_b: formData.get('it_elective_b'),
        ssdx_elective: formData.get('ssdx_elective'),
        batch: formData.get('batch')
    };
    // Ensure department key is synced
    localStorage.setItem('department', 'IT');
    localStorage.setItem(CONFIG_KEY, JSON.stringify(userConfig));
    showApp();
});

setupBioForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const formData = new FormData(setupBioForm);
    userConfig = {
        dept: 'BIO',
        bio_elective: formData.get('bio_elective'),
        ssdx_elective: formData.get('ssdx_elective'),
        chem_elective: formData.get('chem_elective'),
        batch: formData.get('batch')
    };
    // Ensure department key is synced
    localStorage.setItem('department', 'BIO');
    localStorage.setItem(CONFIG_KEY, JSON.stringify(userConfig));
    showApp();
});

resetBtn.addEventListener('click', () => {
    if (confirm("Are you sure you want to reset your setup? This won't delete attendance data.")) {
        localStorage.removeItem(CONFIG_KEY);
        localStorage.removeItem('department');
        userConfig = null;
        location.reload();
    }
});



// Notes & History Listeners
notesTrigger.addEventListener('click', showNotes);
backFromNotesBtn.addEventListener('click', () => {
    screens.notes.classList.add('hidden');
    screens.app.classList.remove('hidden');
});

notesSubjectSelect.addEventListener('change', (e) => {
    const subject = e.target.value;
    if (subject) {
        notesArea.value = notesData[subject] || '';
    } else {
        notesArea.value = '';
    }
});

notesArea.addEventListener('input', () => {
    const subject = notesSubjectSelect.value;
    if (!subject) return;

    notesData[subject] = notesArea.value;
    localStorage.setItem(NOTES_KEY, JSON.stringify(notesData));

    notesStatus.textContent = 'Saving...';
    setTimeout(() => { notesStatus.textContent = 'Saved'; }, 800);
});

overallProgressSection.addEventListener('click', () => showHistory(null)); // Overall History

backFromHistoryBtn.addEventListener('click', () => {
    if (selectedHistorySubject) {
        // If deep in subject history, go back to overall history? 
        // Or just back to app? User said "Overall -> Subject -> Back -> Overall".
        // Wait, normally Back goes to previous screen.
        // If I am in Subject History, Back should go to App (where I clicked subject) 
        // OR Back goes to Overall History (if accessed from there, but it's accessed from stats list in App).
        // Let's stick to standard: Back -> App.
        // BUT, user asked "Overall -> Subject -> Back -> Overall" implies navigation stack.
        // Current implementation: Stats List is in App. 
        // So clicking Subject -> Opens History. Back -> Should go to App.
        // Clicking Overall Circle -> Opens History. Back -> Should go to App.
        // So standard behavior is fine.
        selectedHistorySubject = null;
        screens.history.classList.add('hidden');
        screens.app.classList.remove('hidden');
    } else {
        screens.history.classList.add('hidden');
        screens.app.classList.remove('hidden');
    }
});

filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        renderHistoryList(btn.dataset.filter);
    });
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
    screens.dept.classList.add('hidden');
    screens.setup.classList.add('hidden');
    screens.setupBio.classList.add('hidden');
    screens.setupBio.classList.add('hidden');
    screens.notes.classList.add('hidden');
    screens.history.classList.add('hidden');
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

    // Saturday Logic - Check Override
    let effectiveDay = dayOfWeek;
    let isSaturdayWorking = false;
    let satOverrideDay = null;

    if (dayOfWeek === 6) {
        if (saturdayData[dateKey]) {
            effectiveDay = saturdayData[dateKey];
            isSaturdayWorking = true;
            satOverrideDay = effectiveDay;
        }
    }

    if ((dayOfWeek === 0 || dayOfWeek === 6) && !isSaturdayWorking) {
        subjectsContainer.innerHTML = '<div class="empty-state">No classes today! 🎉</div>';

        // Add "Add Class" button only for Saturday
        if (dayOfWeek === 6) {
            appendSaturdayControl(dateKey, null);
        }

        appendHolidayButton(dateKey, false);
        return;
    }

    // Determine Timetable based on Department
    const isBio = (userConfig.dept === 'BIO');
    const timetableSource = isBio ? BIO_TIMETABLE : TIMETABLE;

    if (!timetableSource[effectiveDay]) {
        subjectsContainer.innerHTML = '<div class="empty-state">No classes today! 🎉</div>';
        appendHolidayButton(dateKey, false);
        return;
    }

    // If Saturday is working, show control at top
    if (isSaturdayWorking) {
        appendSaturdayControl(dateKey, satOverrideDay);
    }

    const slots = timetableSource[effectiveDay];

    if (isBio) {
        renderSubjectsBio(effectiveDay, dateKey, slots); // Pass effectiveDay for logic but dateKey for storage
        appendHolidayButton(dateKey, false);
        return;
    }

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

// Saturday UI Helpers
function appendSaturdayControl(dateKey, currentDayIndex) {
    const div = document.createElement('div');
    div.className = 'saturday-control';

    if (currentDayIndex) {
        // Active State
        const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

        div.innerHTML = `
            <div class="saturday-active-info">
                <span class="saturday-active-text">Working Day (${dayNames[currentDayIndex]} Timetable)</span>
                <button class="btn-remove-saturday" onclick="removeSaturday('${dateKey}')">Remove</button>
            </div>
        `;
        // Insert at TOP
        subjectsContainer.prepend(div);
    } else {
        // Add Class State
        div.innerHTML = `
            <h4>Saturday Working Day?</h4>
            <p>If classes are held today, click below to apply a weekday timetable.</p>
            <button class="saturday-add-btn" onclick="openSaturdayModal()">
                <span>➕</span> Add Class
            </button>
        `;
        subjectsContainer.appendChild(div);
    }
}

// Saturday Logic Functions
window.openSaturdayModal = function () {
    const el = document.getElementById('saturday-modal');
    if (el) el.classList.remove('hidden');
}

window.closeSaturdayModal = function () {
    const el = document.getElementById('saturday-modal');
    if (el) el.classList.add('hidden');
}

window.applySaturday = function (dayIndex) {
    const dateKey = formatDateKey(selectedDate); // Use currently selected date
    saturdayData[dateKey] = dayIndex;
    saveData();
    closeSaturdayModal();
    selectDate(selectedDate); // Re-render
}

window.removeSaturday = function (dateKey) {
    if (confirm("Mark this Saturday as 'No Classes'?")) {
        delete saturdayData[dateKey];
        saveData();
        selectDate(selectedDate);
    }
}

// Separate function for BIO rendering logic
function renderSubjectsBio(dayOfWeek, dateKey, slots) {
    slots.forEach(slot => {
        let subjectName = null;

        if (slot.type === 'break') {
            subjectName = slot.name;
        } else if (slot.type === 'fixed') {
            subjectName = slot.name;
        } else if (slot.type === 'elective_bio') {
            subjectName = userConfig.bio_elective;
        } else if (slot.type === 'elective_ssdx') {
            subjectName = userConfig.ssdx_elective;
        } else if (slot.type === 'elective_open') {
            subjectName = userConfig.chem_elective;
        } else if (slot.type === 'batch') {
            subjectName = (userConfig.batch === "1") ? slot.batch1 : slot.batch2;
        }

        if (subjectName) {
            createSubjectCard(slot.time, subjectName, slot.type, dateKey);
        }
    });
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

// Helper for live stats (needs to return clean numbers)
// Note: We already have a getSubjectStats function nearby.

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
    const uniqueKey = `${name} [${time}]`;
    const record = attendanceData[dateKey]?.[uniqueKey];

    // Lookup full subject name
    const fullName = SUBJECT_NAMES[name] || "";

    // Calculate Inline Progress
    const stats = getSubjectStats(name);
    const pct = stats.total === 0 ? 0 : Math.round((stats.present / stats.total) * 100);

    let colorClass = 'progress-red';
    if (pct >= 75) colorClass = 'progress-green';
    else if (pct >= 70) colorClass = 'progress-yellow';

    card.innerHTML = `
        <div class="subject-header" onclick="showHistory('${name}')" style="cursor: pointer;">
            <div style="width: 100%;">
                <span class="subject-time">${time}</span>
                <h3 class="subject-name">${name}</h3>
                <div class="subject-full-name">${fullName}</div>
                
                <div class="subject-progress-bar">
                    <div class="progress-fill ${colorClass}" style="width: ${pct}%"></div>
                </div>
                <div class="progress-text" style="font-weight: 700; font-size: 0.9rem;">${pct}% (${stats.present}/${stats.total}) Attendance</div>

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

// Helper for live stats
function getSubjectStats(subjectName) {
    let total = 0;
    let present = 0;

    Object.keys(attendanceData).forEach(date => {
        Object.keys(attendanceData[date]).forEach(key => {
            const cleanName = key.includes(' [') ? key.substring(0, key.lastIndexOf(' [')) : key;
            if (cleanName === subjectName) {
                total++;
                if (attendanceData[date][key] === 'P') present++;
            }
        });
    });
    return { total, present };
}

// Logic to populate Notes Dropdown
function populateNotesDropdown() {
    notesSubjectSelect.innerHTML = '<option value="">Select Subject...</option>';

    const subjects = new Set();
    Object.keys(attendanceData).forEach(date => {
        Object.keys(attendanceData[date]).forEach(key => {
            const cleanName = key.includes(' [') ? key.substring(0, key.lastIndexOf(' [')) : key;
            subjects.add(cleanName);
        });
    });

    // Also add current viewing day subjects if not attended yet? 
    // Simplified: Just use subjects found in attendance data for now, 
    // plus maybe common ones from Timetable would be better but requires scraping config.
    // For safety, let's stick to what we know or just hardcoded known subjects?
    // Actually, let's use the SUBJECT_NAMES keys that match the department.
    // But that's complex to filter. Let's just use the Set from attendanceData for visited subjects.

    Array.from(subjects).sort().forEach(subj => {
        const option = document.createElement('option');
        option.value = subj;
        // Show Code + Name in option text, but keep Code as value
        const fullName = SUBJECT_NAMES[subj] || "";
        option.textContent = fullName ? `${subj} – ${fullName}` : subj;
        notesSubjectSelect.appendChild(option);
    });
}

// Render History
// Render History
function renderHistoryList(filter) {
    historyList.innerHTML = '';
    const entries = [];

    Object.keys(attendanceData).forEach(date => {
        // Enforce Academic Start Date Check
        if (new Date(date) < ACADEMIC_START) return;

        Object.keys(attendanceData[date]).forEach(key => {
            const status = attendanceData[date][key];
            if (filter !== 'all' && status !== filter) return;

            const cleanName = key.includes(' [') ? key.substring(0, key.lastIndexOf(' [')) : key;

            // Subject Filter (Drilldown)
            if (selectedHistorySubject && cleanName !== selectedHistorySubject) return;

            const timeSlot = key.includes(' [') ? key.substring(key.lastIndexOf(' [') + 2, key.length - 1) : '';

            entries.push({
                date: date,
                name: cleanName,
                time: timeSlot,
                status: status
            });
        });
    });

    // Sort by date desc (Robust comparison)
    entries.sort((a, b) => b.date.localeCompare(a.date));

    if (entries.length === 0) {
        historyList.innerHTML = '<div class="empty-state">No records found.</div>';
        return;
    }

    entries.forEach(item => {
        const div = document.createElement('div');
        div.className = `history-item ${item.status === 'P' ? 'present' : 'absent'}`;

        // Fix Date Display (avoid timezone shift)
        // Parse YYYY-MM-DD -> Date object in local time
        const [y, m, d] = item.date.split('-').map(Number);
        const localDate = new Date(y, m - 1, d); // Local midnight
        const dateStr = localDate.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
        const fullName = SUBJECT_NAMES[item.name] || item.name;

        // Enhanced Card Design
        div.innerHTML = `
            <div class="history-info" style="flex: 1;">
                <h4 style="font-size: 1.15rem; font-weight: 800; margin-bottom: 2px;">${item.name}</h4>
                <p style="font-size: 0.85rem; opacity: 0.8; margin-bottom: 6px;">${fullName}</p>
                <p style="font-size: 0.8rem; color: var(--text-secondary);">${dateStr} • ${item.time}</p>
            </div>
            <div style="
                font-weight: 700; 
                padding: 6px 12px; 
                border-radius: 20px; 
                background: ${item.status === 'P' ? '#ECFDF5' : '#FEF2F2'}; 
                color: ${item.status === 'P' ? 'var(--success)' : 'var(--danger)'};
                border: 1px solid ${item.status === 'P' ? '#A7F3D0' : '#FECACA'};
                box-shadow: 0 1px 2px rgba(0,0,0,0.05);
                font-size: 0.85rem;">
                ${item.status === 'P' ? 'Present' : 'Absent'}
            </div>
        `;
        historyList.appendChild(div);
    });
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
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
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

    // Add Horizontal Bar if it doesn't exist or update it
    let overallBar = document.getElementById('overall-bar-fill');
    if (!overallBar) {
        // Create the container if missing (one-time injection basically)
        const container = document.createElement('div');
        container.className = 'overall-bar-container';
        container.innerHTML = `<div id="overall-bar-fill" class="overall-bar-fill" style="width: 0%"></div>`;

        // Append to overview text or parent
        const overviewParent = document.querySelector('.overall-progress');
        if (overviewParent && !overviewParent.querySelector('.overall-bar-container')) {
            // We want it BELOW the circle, so maybe outside overall-progress flex?
            // User asked: "add a horizontal progress bar below it".
            // Let's look at HTML structure... .overall-progress is flex row.
            // We should probably append it to .stats-overview, after .overall-progress.
            // But stats-overview has many children.
            // Let's enable dynamic insertion.
            const statsOverview = document.querySelector('.stats-overview');
            // Insert after overall-progress
            statsOverview.insertBefore(container, document.getElementById('subject-stats-list'));
            overallBar = container.querySelector('#overall-bar-fill');
        }
    }

    if (overallBar) {
        overallBar.style.width = `${pct}%`;
        overallBar.style.backgroundColor = pct >= 75 ? 'var(--success)' : (pct >= 70 ? '#F59E0B' : 'var(--danger)');
    }

    // Per Subject
    subjectStatsList.innerHTML = '';
    Object.keys(subjectCounts).forEach(subj => {
        const s = subjectCounts[subj];
        const sPct = Math.round((s.present / s.total) * 100);

        const row = document.createElement('div');
        row.className = 'stat-row';
        // Make row clickable for drilldown
        row.onclick = () => showHistory(subj);
        row.style.cursor = 'pointer';

        // Lookup full subject name
        const fullName = SUBJECT_NAMES[subj] || "";

        row.innerHTML = `
            <div style="display: flex; flex-direction: column; gap: 2px;">
                 <span style="font-weight: 700; font-size: 1rem;">${subj}</span>
                 <span style="font-size: 0.8rem; color: var(--text-secondary); opacity: 0.8;">${fullName}</span>
            </div>
            <span style="color: ${sPct < 75 ? 'var(--danger)' : 'var(--success)'}; font-weight: 700;">${sPct}% (${s.present}/${s.total})</span>
        `;
        subjectStatsList.appendChild(row);
    });
}

// Start
init();
