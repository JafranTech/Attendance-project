/**
 * Student Attendance PWA Logic
 */

// ── Auth Guard ───────────────────────────────────────────────────────────────
// Redirect to login if no JWT token is stored
(function checkAuth() {
    if (!localStorage.getItem('token')) {
        window.location.replace('login.html');
    }
})();

// --- Constants & Config ---
// Config keys are scoped per user to prevent cross-user data leakage.
// Attendance data is NEVER stored in localStorage — fetched from /api/attendance only.
function getUserScopedKey(base) {
    try {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        return user.id ? `${base}_${user.id}` : base;
    } catch { return base; }
}
function CONFIG_KEY() { return getUserScopedKey('attendance_config'); }
function HOLIDAYS_KEY() { return getUserScopedKey('attendance_holidays'); }
function NOTES_KEY_FN() { return getUserScopedKey('attendance_notes'); }
function SATURDAY_KEY_FN() { return getUserScopedKey('attendance_saturday_map'); }
function DEPARTMENT_KEY() { return getUserScopedKey('attendance_department'); }
const PROFILE_KEY = 'attendance_profile'; // profile is device-level, not sensitive
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
    setupManual: document.getElementById('setup-screen-manual'),
    setupManualTimetable: document.getElementById('setup-screen-manual-timetable'),
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
const changeTTBtn = document.getElementById('change-timetable-btn');
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

// --- Subscription Enforcement ---

// Returns { allowed: bool, days_remaining: number, plan: string } for profile chip
async function checkSubscriptionStatus() {
    const token = localStorage.getItem('token');
    if (!token) return { allowed: false, days_remaining: 0, plan: null };

    try {
        const res = await fetch('/api/subscription', {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        const data = await res.json();

        if (data.status === 'expired' || data.status === 'none') {
            showSubscriptionLock(data);
            return { allowed: false, days_remaining: 0, plan: data.plan };
        }

        // Active — inject plan badge into header
        const badge = document.getElementById('plan-badge');
        if (badge) {
            const plan = data.plan || 'trial';
            const days = data.days_remaining || 0;

            if (plan === 'trial') {
                badge.textContent = `🎯 Trial – ${days}d left`;
                badge.className = 'plan-badge badge-trial';
            } else if (plan === 'monthly') {
                badge.textContent = `✅ Monthly – ${days}d`;
                badge.className = 'plan-badge badge-active';
            } else if (plan === 'semester') {
                badge.textContent = `✅ Semester – ${days}d`;
                badge.className = 'plan-badge badge-active';
            }
            badge.classList.remove('hidden');
            badge.style.cursor = 'pointer';
            badge.title = 'View your plan';
            badge.addEventListener('click', () => {
                window.location.href = 'plans.html';
            });
        }

        return { allowed: true, days_remaining: data.days_remaining || 0, plan: data.plan };
    } catch (err) {
        console.warn('[subscription] Check failed (offline?):', err.message);
        return { allowed: true, days_remaining: null, plan: null }; // allow offline usage gracefully
    }
}

function showSubscriptionLock(data) {
    const overlay = document.getElementById('subscription-overlay');
    if (!overlay) return;

    // Fill in plan info
    const planNameEl = document.getElementById('lock-plan-name');
    const expiryEl = document.getElementById('lock-expiry-text');
    if (planNameEl) planNameEl.textContent = data.plan || 'Trial';
    if (expiryEl && data.expiry_date) {
        const expiry = new Date(data.expiry_date);
        expiryEl.textContent = `Expired ${expiry.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`;
    }

    overlay.classList.remove('hidden');

    // Logout button on lock screen
    const logoutBtn = document.getElementById('lock-logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.replace('login.html');
        });
    }

    // Upgrade buttons — initiate Razorpay payment
    const token = localStorage.getItem('token');

    // ── Polling helper: same pattern as plans.html ────────────────────────────
    // Razorpay fires the frontend handler callback BEFORE the webhook reaches
    // the server and updates the DB. We poll to confirm the DB has been updated
    // before showing success and reloading — prevents false success screens.
    async function waitForPlanActivation(expectedPlan, maxAttempts = 10, delayMs = 2000) {
        for (let i = 0; i < maxAttempts; i++) {
            await new Promise(r => setTimeout(r, delayMs));
            try {
                const res = await fetch('/api/subscription', {
                    headers: { 'Authorization': 'Bearer ' + token }
                });
                if (!res.ok) continue;
                const sub = await res.json();
                if (sub.plan === expectedPlan && sub.status === 'active') return true;
            } catch {
                // Network hiccup — keep polling
            }
        }
        return false; // Timed out — webhook may have been delayed
    }

    // ── Lock overlay spinner helpers ──────────────────────────────────────────
    function showLockSpinner(msg) {
        const el = document.getElementById('lock-payment-status');
        if (!el) return;
        el.textContent = msg;
        el.style.display = 'block';
    }
    function hideLockSpinner() {
        const el = document.getElementById('lock-payment-status');
        if (el) el.style.display = 'none';
    }

    async function startUpgrade(plan) {
        const planLabel = plan.charAt(0).toUpperCase() + plan.slice(1);

        if (typeof Razorpay === 'undefined') {
            alert('Payment gateway not loaded. Please refresh and try again.');
            return;
        }

        let order;
        try {
            const r = await fetch('/api/create-order', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + token
                },
                body: JSON.stringify({ plan })
            });
            order = await r.json();
            if (!r.ok) throw new Error(order.error || 'Failed to create order');
        } catch (err) {
            alert('Could not initiate payment: ' + err.message);
            return;
        }

        const rzp = new Razorpay({
            key:         order.razorpay_key_id || '',
            amount:      order.amount,
            currency:    order.currency,
            name:        'Attendance App',
            description: `${planLabel} Plan`,
            order_id:    order.order_id,
            theme:       { color: '#2563EB' },

            // ── SECURITY FIX: do NOT trust the frontend callback alone. ──────
            // Poll the server until the webhook has confirmed the DB update.
            handler: async function (_response) {
                // Hide buttons; show waiting message
                [document.getElementById('upgrade-monthly-btn'),
                 document.getElementById('upgrade-semester-btn')]
                    .filter(Boolean)
                    .forEach(b => { b.disabled = true; });

                showLockSpinner('⏳ Payment received. Activating your plan…');

                const activated = await waitForPlanActivation(plan);

                if (activated) {
                    showLockSpinner('✅ Plan activated! Reloading…');
                    setTimeout(() => window.location.reload(), 1500);
                } else {
                    // Webhook may be delayed — inform user, reload anyway
                    // (the subscription check on reload will reflect the real state)
                    showLockSpinner(
                        '✅ Payment received! Your plan is activating and will ' +
                        'be ready within a minute. Reloading…'
                    );
                    setTimeout(() => window.location.reload(), 3000);
                }
            },

            modal: {
                ondismiss: function () {
                    hideLockSpinner();
                    [document.getElementById('upgrade-monthly-btn'),
                     document.getElementById('upgrade-semester-btn')]
                        .filter(Boolean)
                        .forEach(b => { b.disabled = false; });
                }
            }
        });
        rzp.open();
    }

    const monthlyBtn = document.getElementById('upgrade-monthly-btn');
    const semesterBtn = document.getElementById('upgrade-semester-btn');
    if (monthlyBtn) monthlyBtn.addEventListener('click', () => startUpgrade('monthly'));
    if (semesterBtn) semesterBtn.addEventListener('click', () => startUpgrade('semester'));
}

// --- Initialization ---
async function init() {
    // ── Step 1: Hydrate localStorage from server — ALWAYS overwrite ──────────
    // Server is the single source of truth (like FB, ChatGPT).
    // Every device must receive and apply the server config on every app load.
    try {
        const token = localStorage.getItem('token');
        if (token) {
            const meRes = await fetch('/api/me', {
                headers: { 'Authorization': 'Bearer ' + token }
            });
            if (meRes.ok) {
                const meData = await meRes.json();
                if (meData.user) {
                    localStorage.setItem('user', JSON.stringify(meData.user));
                }
            }
        }
        
        const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
        if (storedUser.id) {
            const deptKey = `attendance_department_${storedUser.id}`;
            const configKey = `attendance_config_${storedUser.id}`;

            if (storedUser.department) {
                const localDept = localStorage.getItem(deptKey);
                // If server says different department than what's cached locally,
                // clear the stale local config so setup re-runs for the correct dept.
                if (localDept && localDept !== storedUser.department) {
                    console.warn(`[init] Department mismatch: local="${localDept}" server="${storedUser.department}". Resetting to server config.`);
                    localStorage.removeItem(configKey); // stale config must go
                }
                // Always write the server department — no condition
                localStorage.setItem(deptKey, storedUser.department);
            }

            if (storedUser.config) {
                const configValue = typeof storedUser.config === 'string'
                    ? storedUser.config
                    : JSON.stringify(storedUser.config);
                // Always write the server config
                localStorage.setItem(configKey, configValue);
            }
        }
    } catch (e) {
        console.warn('[init] Failed to hydrate config from user object:', e);
    }

    // ── Step 2: Load local data (now hydrated from server) ────────────────
    loadData();
    loadTheme();

    // ── Step 3: Subscription check ────────────────────────────────────────
    const subResult = await checkSubscriptionStatus();
    if (subResult.allowed === false) return; // lock screen shown, stop init

    // ── Step 4: Render profile chip with real account name + sub info ─────
    renderProfileUI(subResult);

    // ── Step 5: Inject logout button into header ──────────────────────────
    if (headerRight && !document.getElementById('logout-btn')) {
        const logoutBtn = document.createElement('button');
        logoutBtn.id = 'logout-btn';
        logoutBtn.className = 'icon-btn logout-btn';
        logoutBtn.setAttribute('aria-label', 'Logout');
        logoutBtn.title = 'Logout';
        logoutBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>`;
        logoutBtn.addEventListener('click', () => {
            if (confirm('Are you sure you want to log out?')) {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                window.location.replace('login.html');
            }
        });
        headerRight.insertBefore(logoutBtn, headerRight.firstChild);
    }

    // ── Step 6: Show app or setup screen ──────────────────────────────────
    if (userConfig) {
        await loadAttendanceFromApi();
        showApp();
    } else {
        checkDepartment();
    }
}


function checkDepartment() {
    let dept = localStorage.getItem(DEPARTMENT_KEY());
    if (!dept) {
        const oldDept = localStorage.getItem('department');
        if (oldDept) {
            dept = oldDept;
            localStorage.setItem(DEPARTMENT_KEY(), dept);
        }
    }

    if (!dept) {
        showDeptSelection();
    } else if (dept === 'BIO') {
        showSetupBio();
    } else if (dept === 'MANUAL') {
        // MANUAL: config already saved (manual_timetable exists) → go to app
        // If config missing, restart at manual info screen
        if (userConfig && userConfig.manual_timetable) {
            // should not get here (loadData already populated userConfig, init() calls showApp)
            showSetupManual();
        } else {
            showSetupManual();
        }
    } else if (dept === 'IT') {
        showSetup();
    } else {
        localStorage.removeItem(DEPARTMENT_KEY());
        showDeptSelection();
    }
}

function loadData() {
    const configKey = CONFIG_KEY();
    const config = localStorage.getItem(configKey);
    if (config) {
        userConfig = JSON.parse(config);
        // Safety check: reset if old IT config schema, but ignore this for BIO department
        if (userConfig.dept === 'IT' || !userConfig.dept) {
            if (userConfig.it_elective || !userConfig.it_elective_a || !userConfig.it_elective_b) {
                console.log('[loadData] Migrating config for new IT elective schema');
                userConfig = null;
                localStorage.removeItem(configKey);
                localStorage.removeItem(DEPARTMENT_KEY());
            }
        }
    }

    // attendanceData is NEVER read from localStorage — it is fetched from /api/attendance
    // See loadAttendanceFromApi() which is called in init()

    const holidays = localStorage.getItem(HOLIDAYS_KEY());
    if (holidays) holidaysData = JSON.parse(holidays);

    const profile = localStorage.getItem(PROFILE_KEY);
    if (profile) profileData = JSON.parse(profile);

    const notes = localStorage.getItem(NOTES_KEY_FN());
    if (notes) notesData = JSON.parse(notes);

    const satMap = localStorage.getItem(SATURDAY_KEY_FN());
    if (satMap) saturdayData = JSON.parse(satMap);
}

// Load attendance from backend — populates in-memory attendanceData
async function loadAttendanceFromApi() {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
        const res = await fetch('/api/attendance', {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        if (!res.ok) {
            console.warn('[loadAttendanceFromApi] Non-200 response:', res.status);
            return;
        }
        const json = await res.json();
        // API returns: [{ subject, date, status }]
        // attendanceData structure: { 'YYYY-MM-DD': { 'SubjectName [Time]': 'P'|'A' } }
        // Since backend stores subject as 'SubjectName [Time]', reconstruct directly
        attendanceData = {};
        (json.attendance || []).forEach(row => {
            if (!attendanceData[row.date]) attendanceData[row.date] = {};
            attendanceData[row.date][row.subject] = row.status;
        });
        console.log('[loadAttendanceFromApi] Loaded', (json.attendance || []).length, 'records');
    } catch (err) {
        console.warn('[loadAttendanceFromApi] Failed (offline?):', err.message);
    }
}

function saveData() {
    // NOTE: attendanceData is NOT saved to localStorage.
    // It lives in memory only and is persisted to the backend via POST /api/attendance.
    localStorage.setItem(HOLIDAYS_KEY(), JSON.stringify(holidaysData));
    localStorage.setItem(SATURDAY_KEY_FN(), JSON.stringify(saturdayData));
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
function _hideAllScreens() {
    Object.values(screens).forEach(s => s && s.classList.add('hidden'));
}

function showDeptSelection() {
    _hideAllScreens();
    screens.dept.classList.remove('hidden');
}

function showSetup() {
    _hideAllScreens();
    screens.setup.classList.remove('hidden');
}

function showSetupBio() {
    _hideAllScreens();
    screens.setupBio.classList.remove('hidden');
}

function showSetupManual() {
    _hideAllScreens();
    screens.setupManual.classList.remove('hidden');
}

function showSetupManualTimetable() {
    _hideAllScreens();
    screens.setupManualTimetable.classList.remove('hidden');
    renderManualTimetableBuilder();
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



// --- Config Sync Function ---
// Syncs department+config to server AND patches the local 'user' object
// so that on next page reload, init() hydration finds the correct values
// without needing a fresh login. This is how FB/ChatGPT work.
async function syncConfigToServer(department, config) {
    const token = localStorage.getItem('token');
    if (!token) return;

    // ── Immediately patch user in localStorage (source of truth for hydration) ──
    try {
        const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
        if (department !== null) storedUser.department = department;
        if (config !== null) storedUser.config = config;
        localStorage.setItem('user', JSON.stringify(storedUser));
    } catch (e) {
        console.warn('[syncConfig] Could not patch user in localStorage:', e);
    }

    // ── Persist to server in background ──────────────────────────────────────
    try {
        await fetch('/api/sync-config', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ department, config })
        });
    } catch (e) {
        console.warn('[syncConfig] Server sync failed (offline?):', e);
    }
}

// --- Setup Form Handlers ---
deptForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const formData = new FormData(deptForm);
    const dept = formData.get('dept');
    localStorage.setItem(DEPARTMENT_KEY(), dept);
    if (dept === 'MANUAL') {
        syncConfigToServer(dept, null);
        showSetupManual();
    } else {
        syncConfigToServer(dept, null);
        checkDepartment();
    }
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
    localStorage.setItem(DEPARTMENT_KEY(), 'IT');
    localStorage.setItem(CONFIG_KEY(), JSON.stringify(userConfig));
    syncConfigToServer('IT', userConfig);
    showApp();
    checkSubscriptionStatus().then(res => renderProfileUI(res));
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
    localStorage.setItem(DEPARTMENT_KEY(), 'BIO');
    localStorage.setItem(CONFIG_KEY(), JSON.stringify(userConfig));
    syncConfigToServer('BIO', userConfig);
    showApp();
    checkSubscriptionStatus().then(res => renderProfileUI(res));
});

resetBtn.addEventListener('click', () => {
    if (confirm("Are you sure you want to reset your setup? This won't delete attendance data.")) {
        localStorage.removeItem(CONFIG_KEY());
        localStorage.removeItem(DEPARTMENT_KEY());
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
    localStorage.setItem(NOTES_KEY_FN(), JSON.stringify(notesData));

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
if (changeTTBtn) {
    changeTTBtn.addEventListener('click', () => {
        closeProfile();
        setTimeout(() => openResetTimetableModal(), 300);
    });
}

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

function renderProfileUI(subResult) {
    // Get real account name from registered user (server-side)
    let accountName = 'User';
    try {
        const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
        accountName = storedUser.name || profileData.name || 'User';
    } catch (e) { /* ignore */ }

    const initial = accountName.charAt(0).toUpperCase();

    // Update profile chip in header
    const chipAvatar = document.getElementById('profile-chip-avatar');
    const chipName = document.getElementById('chip-name');
    const chipSub = document.getElementById('chip-sub');

    if (chipAvatar) chipAvatar.textContent = initial;
    if (chipName) chipName.textContent = accountName;
    if (chipSub && subResult) {
        if (subResult.days_remaining !== null) {
            const days = subResult.days_remaining;
            const plan = subResult.plan || 'trial';
            if (plan === 'trial') {
                chipSub.textContent = `Trial · ${days}d left`;
                chipSub.style.color = days <= 1 ? '#ef4444' : '#f59e0b';
            } else {
                chipSub.textContent = `${plan.charAt(0).toUpperCase() + plan.slice(1)} · ${days}d`;
                chipSub.style.color = '#22c55e';
            }
        } else {
            chipSub.textContent = 'Offline';
        }
    }

    // Also update avatar in drawer preview
    const avatarSrc = profileData.avatar;
    const getAvatarHTML = (src) => {
        if (src && src.startsWith('data:image')) {
            return `<img src="${src}" alt="Profile">`;
        }
        return `<div class="default-avatar" style="font-size: 1rem">${initial}</div>`;
    };
    // Trigger element was updated with chip HTML in index.html — no innerHTML needed
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
    _hideAllScreens();
    screens.app.classList.remove('hidden');

    // Set initial state
    const safeDate = getInitialSafeDate();
    viewingMonth = new Date(safeDate);
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

    // ── MANUAL TIMETABLE: isolated data source switch ──────────────
    if (userConfig.dept === 'MANUAL') {
        if (isSaturdayWorking) appendSaturdayControl(dateKey, satOverrideDay);
        renderSubjectsManual(effectiveDay, dateKey);
        return;
    }

    // Determine Timetable based on Department (IT / BIO — unchanged)
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

    renderBulkActionBar(dateKey, slots);

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
    renderBulkActionBar(dateKey, slots);

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
window.mark = async function (dateKey, storageKey, newStatus) {
    if (!attendanceData[dateKey]) attendanceData[dateKey] = {};

    // Toggle: clicking same status again removes the record
    const wasToggled = attendanceData[dateKey][storageKey] === newStatus;
    if (wasToggled) {
        delete attendanceData[dateKey][storageKey];
    } else {
        attendanceData[dateKey][storageKey] = newStatus;
    }

    // Re-render immediately for snappy UX
    selectDate(selectedDate);
    updateStats();

    // Persist to backend asynchronously
    const token = localStorage.getItem('token');
    try {
        const method = wasToggled ? 'DELETE' : 'POST';
        const res = await fetch('/api/attendance', {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify({ subject: storageKey, date: dateKey, status: newStatus })
        });

        if (res.status === 403) {
            const err = await res.json();
            // Revert in-memory state
            if (wasToggled) {
                attendanceData[dateKey][storageKey] = newStatus;
            } else {
                delete attendanceData[dateKey][storageKey];
            }
            selectDate(selectedDate);
            updateStats();
            alert('⚠️ ' + (err.message || 'Your trial has ended. Please upgrade to continue.'));
            return;
        }

        if (!res.ok) {
            console.error('[mark] API error:', res.status);
        }
    } catch (err) {
        console.warn('[mark] Network error (offline?):', err.message);
        // Keep in-memory state as-is for offline resilience
    }
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
        let displaySubj = subj;
        let fullName = SUBJECT_NAMES[subj] || "";

        if (!fullName && subj.includes(' - ')) {
            const parts = subj.split(' - ');
            displaySubj = parts[0].trim();
            fullName = parts.slice(1).join(' - ').trim();
        } else if (!fullName) {
            fullName = "Manual Subject";
        }

        row.innerHTML = `
            <div style="display: flex; flex-direction: column; gap: 2px;">
                 <span style="font-weight: 700; font-size: 1rem;">${displaySubj}</span>
                 <span style="font-size: 0.8rem; color: var(--text-secondary); opacity: 0.8;">${fullName}</span>
            </div>
            <span style="color: ${sPct < 75 ? 'var(--danger)' : 'var(--success)'}; font-weight: 700;">${sPct}% (${s.present}/${s.total})</span>
        `;
        subjectStatsList.appendChild(row);
    });
}

// ═══════════════════════════════════════════════════════════════
// MANUAL TIMETABLE MODE — ISOLATED FEATURE BLOCK
// ═══════════════════════════════════════════════════════════════

// ── State ────────────────────────────────────────────────────────
// Keyed by day name: { Monday: [{code, name}, ...], ... }
const MANUAL_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
// dayIndex maps day name → JS getDay() value
const MANUAL_DAY_INDEX = { Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5 };

let manualTimetableState = {
    Monday: [], Tuesday: [], Wednesday: [], Thursday: [], Friday: []
};

// Persisted details from Step 2
let manualSetupInfo = { college: '', dept: '', semester: '' };

// Which day the modal is currently targeting
let _modalTargetDay = null;

// ── Step 2: Manual Info Form Handler ─────────────────────────────
const setupFormManual = document.getElementById('setup-form-manual');
if (setupFormManual) {
    setupFormManual.addEventListener('submit', (e) => {
        e.preventDefault();

        const college = document.getElementById('manual-college').value.trim();
        const dept    = document.getElementById('manual-dept').value.trim();
        const sem     = document.getElementById('manual-sem').value;

        // Field-level validation
        let valid = true;

        const errCollege = document.getElementById('err-college');
        const errDept    = document.getElementById('err-dept');
        const errSem     = document.getElementById('err-sem');

        if (!college) { errCollege.classList.remove('hidden'); valid = false; }
        else { errCollege.classList.add('hidden'); }

        if (!dept) { errDept.classList.remove('hidden'); valid = false; }
        else { errDept.classList.add('hidden'); }

        if (!sem) { errSem.classList.remove('hidden'); valid = false; }
        else { errSem.classList.add('hidden'); }

        if (!valid) return;

        manualSetupInfo = { college, dept, semester: sem };
        // Reset state on each fresh entry to Step 3
        manualTimetableState = { Monday: [], Tuesday: [], Wednesday: [], Thursday: [], Friday: [] };

        showSetupManualTimetable();
    });
}

// ── Step 3: Timetable Builder ─────────────────────────────────────

function renderManualTimetableBuilder() {
    const wrapper = document.getElementById('manual-days-wrapper');
    if (!wrapper) return;
    wrapper.innerHTML = '';

    MANUAL_DAYS.forEach(day => {
        const section = document.createElement('div');
        section.className = 'manual-day-section';
        section.id = `manual-day-${day}`;

        const subjects = manualTimetableState[day] || [];
        if (subjects.length > 0) section.classList.add('has-subjects');

        section.innerHTML = `
            <div class="manual-day-section-header">
                <span class="manual-day-title">${day}</span>
                <span class="manual-day-meta">${subjects.length} subject${subjects.length !== 1 ? 's' : ''}</span>
            </div>
            <ul class="manual-subject-list" id="slist-${day}"></ul>
            <button class="manual-add-subject-btn" data-day="${day}" type="button">
                <span class="plus-icon">+</span> Add Subject
            </button>
        `;
        wrapper.appendChild(section);

        // Populate existing subjects
        const list = section.querySelector(`#slist-${day}`);
        subjects.forEach((subj, idx) => _appendSubjectItem(list, day, subj, idx));

        // Bind "+" button
        section.querySelector('.manual-add-subject-btn').addEventListener('click', () => {
            openAddSubjectModal(day);
        });
    });

    // Save & Continue button
    const saveBtn = document.getElementById('manual-tt-save-btn');
    if (saveBtn) {
        saveBtn.addEventListener('click', handleManualTimetableSave, { once: false });
    }
}

// Add a rendered <li> for a subject
function _appendSubjectItem(listEl, day, subj, idx) {
    const li = document.createElement('li');
    li.className = 'manual-subject-item';
    li.dataset.idx = idx;
    li.innerHTML = `
        <div class="manual-subject-info">
            <div class="manual-subject-code">${subj.code}</div>
            <div class="manual-subject-name">${subj.name}</div>
        </div>
        <button class="manual-subject-remove" title="Remove" type="button" aria-label="Remove ${subj.code}">×</button>
    `;
    li.querySelector('.manual-subject-remove').addEventListener('click', () => {
        removeManualSubject(day, idx);
    });
    listEl.appendChild(li);
}

function removeManualSubject(day, idx) {
    manualTimetableState[day].splice(idx, 1);
    refreshDaySection(day);
}

function refreshDaySection(day) {
    const section = document.getElementById(`manual-day-${day}`);
    if (!section) return;

    const subjects = manualTimetableState[day] || [];
    section.classList.toggle('has-subjects', subjects.length > 0);

    // Update meta count
    const meta = section.querySelector('.manual-day-meta');
    if (meta) meta.textContent = `${subjects.length} subject${subjects.length !== 1 ? 's' : ''}`;

    // Rebuild the subject list
    const list = section.querySelector(`#slist-${day}`);
    if (list) {
        list.innerHTML = '';
        subjects.forEach((subj, i) => _appendSubjectItem(list, day, subj, i));
    }
}

// ── Add Subject Modal ─────────────────────────────────────────────

function openAddSubjectModal(day) {
    _modalTargetDay = day;

    const modal = document.getElementById('add-subject-modal');
    const label = document.getElementById('add-subject-modal-day-label');
    const codeInput = document.getElementById('modal-course-code');
    const nameInput = document.getElementById('modal-course-name');
    const errCode   = document.getElementById('err-modal-code');
    const errName   = document.getElementById('err-modal-name');

    if (label)     label.textContent = day;
    if (codeInput) {
        codeInput.value = '';
        errCode && errCode.classList.add('hidden');
        // Feature 3: Uppercase live as user types / pastes
        codeInput.oninput = () => {
            const pos = codeInput.selectionStart;
            codeInput.value = codeInput.value.toUpperCase();
            try { codeInput.setSelectionRange(pos, pos); } catch (_) {}
        };
    }
    if (nameInput) { nameInput.value = ''; errName && errName.classList.add('hidden'); }

    modal && modal.classList.remove('hidden');
    setTimeout(() => codeInput && codeInput.focus(), 80);
}

function closeAddSubjectModal() {
    const modal = document.getElementById('add-subject-modal');
    modal && modal.classList.add('hidden');
    _modalTargetDay = null;
}

// Wire modal buttons (once — safe even if called after DOM ready)
(function wireModalButtons() {
    const cancelBtn = document.getElementById('modal-cancel-btn');
    const saveBtn   = document.getElementById('modal-save-btn');

    if (cancelBtn) cancelBtn.addEventListener('click', closeAddSubjectModal);

    if (saveBtn) {
        saveBtn.addEventListener('click', () => {
            const codeInput = document.getElementById('modal-course-code');
            const nameInput = document.getElementById('modal-course-name');
            const errCode   = document.getElementById('err-modal-code');
            const errName   = document.getElementById('err-modal-name');

            const code = codeInput ? codeInput.value.trim().toUpperCase() : '';  // Feature 3: always uppercase
            const name = nameInput ? nameInput.value.trim() : '';

            let valid = true;
            if (!code) { errCode && errCode.classList.remove('hidden'); valid = false; }
            else        { errCode && errCode.classList.add('hidden'); }

            if (!name) { errName && errName.classList.remove('hidden'); valid = false; }
            else        { errName && errName.classList.add('hidden'); }

            if (!valid || !_modalTargetDay) return;

            manualTimetableState[_modalTargetDay].push({ code, name });
            refreshDaySection(_modalTargetDay);
            closeAddSubjectModal();

            // Hide error banner if it was showing
            const errBanner = document.getElementById('manual-tt-error');
            if (errBanner) errBanner.classList.add('hidden');
        });
    }

    // Close on backdrop click
    const modal = document.getElementById('add-subject-modal');
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeAddSubjectModal();
        });
    }
})();

// ── Save & Continue ───────────────────────────────────────────────

function handleManualTimetableSave() {
    const errBanner = document.getElementById('manual-tt-error');

    // Validate every day has at least one subject
    const incompleteDay = MANUAL_DAYS.find(d => manualTimetableState[d].length === 0);
    if (incompleteDay) {
        if (errBanner) errBanner.classList.remove('hidden');
        // Scroll to the incomplete day
        const section = document.getElementById(`manual-day-${incompleteDay}`);
        if (section) section.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
    }

    if (errBanner) errBanner.classList.add('hidden');

    // Build userConfig identically to IT/BIO pattern
    userConfig = {
        dept: 'MANUAL',
        college: manualSetupInfo.college,
        department: manualSetupInfo.dept,
        semester: manualSetupInfo.semester,
        manual_timetable: JSON.parse(JSON.stringify(manualTimetableState)) // deep clone
    };

    localStorage.setItem(DEPARTMENT_KEY(), 'MANUAL');
    localStorage.setItem(CONFIG_KEY(), JSON.stringify(userConfig));
    syncConfigToServer('MANUAL', userConfig);

    showApp();
    checkSubscriptionStatus().then(res => renderProfileUI(res));
}

// ── Attendance Rendering for MANUAL dept ─────────────────────────

/**
 * Renders subject cards for a manual-timetable day.
 * Subjects have no time slot — we use "slot N" as the unique key
 * so attendance data is stored as "CS301 [1]", "CS302 [2]", etc.
 * This keeps the storage key unique per position per day,
 * and is compatible with the existing mark() / markAll() / stats logic.
 */
function renderSubjectsManual(effectiveDay, dateKey) {
    const dayName = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][effectiveDay];
    const subjects = (userConfig.manual_timetable && userConfig.manual_timetable[dayName]) || [];

    if (subjects.length === 0) {
        subjectsContainer.innerHTML = '<div class="empty-state">No classes today! 🎉</div>';
        appendHolidayButton(dateKey, false);
        return;
    }

    // Bulk action bar (manual-friendly version using subjects directly)
    const bulkDiv = document.createElement('div');
    bulkDiv.className = 'bulk-actions-bar';
    bulkDiv.innerHTML = `
        <button class="btn-bulk-action btn-present-all" onclick="markAllManual('${dateKey}', '${dayName}', 'P')">
            ✅ Present All
        </button>
        <button class="btn-bulk-action btn-absent-all" onclick="markAllManual('${dateKey}', '${dayName}', 'A')">
            ❌ Absent All
        </button>
    `;
    subjectsContainer.appendChild(bulkDiv);

    subjects.forEach((subj, i) => {
        const uniqueKey = `${subj.code} [${i + 1}]`;
        const record    = attendanceData[dateKey]?.[uniqueKey];

        const stats = getSubjectStats(subj.code);
        const pct = stats.total === 0 ? 0 : Math.round((stats.present / stats.total) * 100);

        let colorClass = 'progress-red';
        if (pct >= 75) colorClass = 'progress-green';
        else if (pct >= 70) colorClass = 'progress-yellow';

        const card = document.createElement('div');
        card.className = 'subject-card';
        card.innerHTML = `
            <div class="subject-header" onclick="showHistory('${subj.code}')" style="cursor: pointer;">
                <div style="width: 100%;">
                    <span class="subject-time">Subject ${i + 1}</span>
                    <h3 class="subject-name">${subj.code} – ${subj.name}</h3>
                    <div class="subject-full-name">${subj.name}</div>

                    <div class="subject-progress-bar">
                        <div class="progress-fill ${colorClass}" style="width: ${pct}%"></div>
                    </div>
                    <div class="progress-text" style="font-weight: 700; font-size: 0.9rem;">${pct}% (${stats.present}/${stats.total}) Attendance</div>

                    <span class="subject-type">Manual Subject</span>
                </div>
            </div>
            <div class="attendance-actions">
                <button class="btn-action btn-present ${record === 'P' ? 'active' : ''}" onclick="mark('${dateKey}', '${uniqueKey}', 'P')">Present</button>
                <button class="btn-action btn-absent ${record === 'A' ? 'active' : ''}" onclick="mark('${dateKey}', '${uniqueKey}', 'A')">Absent</button>
            </div>
        `;
        subjectsContainer.appendChild(card);
    });

    appendHolidayButton(dateKey, false);
}

// Bulk mark for MANUAL dept
window.markAllManual = async function (dateKey, dayName, status) {
    const action = status === 'P' ? 'Present' : 'Absent';
    if (!confirm(`Mark ALL classes for this date as ${action}?`)) return;

    const subjects = (userConfig.manual_timetable && userConfig.manual_timetable[dayName]) || [];
    if (!subjects.length) return;
    if (!attendanceData[dateKey]) attendanceData[dateKey] = {};

    const toMark = [];
    subjects.forEach((subj, i) => {
        const uniqueKey = `${subj.code} [${i + 1}]`;
        attendanceData[dateKey][uniqueKey] = status;
        toMark.push(uniqueKey);
    });

    selectDate(selectedDate);
    updateStats();

    const token = localStorage.getItem('token');
    for (const storageKey of toMark) {
        try {
            const res = await fetch('/api/attendance', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + token
                },
                body: JSON.stringify({ subject: storageKey, date: dateKey, status })
            });
            if (res.status === 403) {
                const err = await res.json();
                alert('⚠️ ' + (err.message || 'Your trial has ended. Please upgrade.'));
                toMark.forEach(k => { delete attendanceData[dateKey][k]; });
                selectDate(selectedDate);
                updateStats();
                return;
            }
        } catch (e) {
            console.warn('[markAllManual] Network error:', e.message);
        }
    }
};

// ═══════════════════════════════════════════════════════════════
// END: MANUAL TIMETABLE MODE
// ═══════════════════════════════════════════════════════════════

// Start
init();
// --- Bulk Action Logic ---
function renderBulkActionBar(dateKey, slots) {
    const hasClasses = slots.some(slot => {
        if (slot.type === 'break') return false;
        return !!getResolvedSubjectName(slot, userConfig);
    });

    if (!hasClasses) return;

    const div = document.createElement('div');
    div.className = 'bulk-actions-bar';
    div.innerHTML = `
        <button class="btn-bulk-action btn-present-all" onclick="markAll('${dateKey}', 'P')">
            ✅ Present All
        </button>
        <button class="btn-bulk-action btn-absent-all" onclick="markAll('${dateKey}', 'A')">
            ❌ Absent All
        </button>
    `;
    subjectsContainer.appendChild(div);
}

function getResolvedSubjectName(slot, config) {
    if (slot.type === 'break') return slot.name;
    if (slot.type === 'fixed') return slot.name;

    // IT Logic
    if (slot.type === 'elective_it') {
        if (slot.group && config.it_elective_a && slot.group.includes(config.it_elective_a)) return config.it_elective_a;
        if (slot.group && config.it_elective_b && slot.group.includes(config.it_elective_b)) return config.it_elective_b;
        // Fallback or legacy check
        if (slot.group && slot.group.includes(config.it_elective)) return config.it_elective;
        return null;
    }
    if (slot.type === 'elective_ssdx') return config.ssdx_elective;
    if (slot.type === 'batch') return (config.batch === "1") ? slot.batch1 : slot.batch2;

    // Bio Logic
    if (slot.type === 'elective_bio') return config.bio_elective;
    if (slot.type === 'elective_open') return config.chem_elective;

    return null;
}

window.markAll = async function (dateKey, status) {
    const action = status === 'P' ? 'Present' : 'Absent';
    if (!confirm(`Mark ALL classes for this date as ${action}?`)) return;

    const dayOfWeek = selectedDate.getDay();
    let effectiveDay = dayOfWeek;
    if (dayOfWeek === 6 && saturdayData[dateKey]) {
        effectiveDay = saturdayData[dateKey];
    }

    // MANUAL dept uses its own bulk-mark function
    if (userConfig.dept === 'MANUAL') {
        const dayName = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][effectiveDay];
        await window.markAllManual(dateKey, dayName, status);
        return;
    }

    const isBio = (userConfig.dept === 'BIO');
    const timetableSource = isBio ? BIO_TIMETABLE : TIMETABLE;
    const slots = timetableSource[effectiveDay];

    if (!slots) return;

    if (!attendanceData[dateKey]) attendanceData[dateKey] = {};

    const toMark = [];
    slots.forEach(slot => {
        if (slot.type === 'break') return;
        const name = getResolvedSubjectName(slot, userConfig);
        if (name) {
            const uniqueKey = `${name} [${slot.time}]`;
            attendanceData[dateKey][uniqueKey] = status;
            toMark.push(uniqueKey);
        }
    });

    // Re-render immediately
    selectDate(selectedDate);
    updateStats();

    // Persist each record to backend
    const token = localStorage.getItem('token');
    for (const storageKey of toMark) {
        try {
            const res = await fetch('/api/attendance', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + token
                },
                body: JSON.stringify({ subject: storageKey, date: dateKey, status })
            });
            if (res.status === 403) {
                const err = await res.json();
                alert('⚠️ ' + (err.message || 'Your trial has ended. Please upgrade.'));
                // Revert all in-memory
                toMark.forEach(k => { delete attendanceData[dateKey][k]; });
                selectDate(selectedDate);
                updateStats();
                return;
            }
        } catch (e) {
            console.warn('[markAll] Network error:', e.message);
        }
    }
};

// ── Reset Timetable Feature ───────────────────────────────────────────────

function openResetTimetableModal() {
    const modal = document.getElementById('reset-timetable-modal');
    const pwdInput = document.getElementById('reset-password-input');
    const errText = document.getElementById('err-reset-password');

    if (pwdInput) {
        pwdInput.value = '';
        errText && errText.classList.add('hidden');
    }

    modal && modal.classList.remove('hidden');
    setTimeout(() => pwdInput && pwdInput.focus(), 80);
}

function closeResetTimetableModal() {
    const modal = document.getElementById('reset-timetable-modal');
    modal && modal.classList.add('hidden');
}

// Wire Reset Modal Buttons
(function wireResetModal() {
    const cancelBtn = document.getElementById('reset-tt-cancel-btn');
    const confirmBtn = document.getElementById('reset-tt-confirm-btn');
    const modal = document.getElementById('reset-timetable-modal');
    const pwdInput = document.getElementById('reset-password-input');
    
    if (cancelBtn) cancelBtn.addEventListener('click', closeResetTimetableModal);
    
    // Close on backdrop
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeResetTimetableModal();
        });
    }

    if (confirmBtn) {
        confirmBtn.addEventListener('click', async () => {
            const pwd = pwdInput ? pwdInput.value : '';
            const errText = document.getElementById('err-reset-password');
            
            if (!pwd) {
                if (errText) {
                    errText.textContent = 'Password is required.';
                    errText.classList.remove('hidden');
                }
                return;
            }

            // Lock button
            const originalText = confirmBtn.innerHTML;
            confirmBtn.innerHTML = 'Verifying...';
            confirmBtn.disabled = true;
            if (errText) errText.classList.add('hidden');

            try {
                // Determine user email
                const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
                const email = storedUser.email;

                if (!email) {
                    throw new Error("Unable to identify current user for verification.");
                }

                // Verify password against backend (using /api/login endpoint as generic auth check)
                const res = await fetch('/api/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: email, password: pwd })
                });

                if (!res.ok) {
                    const data = await res.json();
                    throw new Error(data.error || 'Incorrect password.');
                }

                // Password Correct! Execute Safe Reset.
                // WE ONLY CLEAR dept AND timetable logic! NEVER clear sub info or core account
                
                if (userConfig) {
                    delete userConfig.dept;
                    delete userConfig.it_elective_a;
                    delete userConfig.it_elective_b;
                    delete userConfig.ssdx_elective;
                    delete userConfig.chem_elective;
                    delete userConfig.bio_elective;
                    delete userConfig.batch;
                    delete userConfig.manual_timetable;
                    delete userConfig.manual_info;
                    
                    localStorage.setItem(CONFIG_KEY(), JSON.stringify(userConfig));
                    syncConfigToServer(null, userConfig); // Update server to reflect cleared dept config
                }

                // ── WIPE ALL ATTENDANCE & LOCAL DATA ──────────────────────────────────
                localStorage.removeItem(DEPARTMENT_KEY());
                localStorage.removeItem(HOLIDAYS_KEY());
                localStorage.removeItem(SATURDAY_KEY_FN());
                attendanceData = {};
                holidaysData = {};
                if (typeof saturdayData !== 'undefined') saturdayData = {};

                // Wipe backend attendance
                try {
                    await fetch('/api/attendance', {
                        method: 'DELETE',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ wipeAll: true })
                    });
                } catch (e) {
                    console.error('Failed to wipe attendance from server:', e);
                }
                // ──────────────────────────────────────────────────────────────────────

                // Reset successful!
                closeResetTimetableModal();
                
                // Route to Department Selection
                checkDepartment(); 
                
            } catch (err) {
                if (errText) {
                    errText.textContent = err.message || 'Verification failed. Please try again.';
                    errText.classList.remove('hidden');
                }
            } finally {
                confirmBtn.innerHTML = originalText;
                confirmBtn.disabled = false;
            }
        });
    }
})();
