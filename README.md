📱 Student Attendance Tracker (PWA)

A mobile-first, offline Progressive Web App (PWA) to help students track their daily attendance accurately based on timetable, electives, batch, and periods.

This is a personal self-tracking tool, not an official college attendance system.

✨ Features

📅 Day & period-based attendance (50-minute periods)

🧠 Smart timetable logic (labs split into multiple periods)

🎓 Elective & batch-based subject loading

🎉 Manual Holiday marking (excluded from attendance)

📊 Subject-wise & overall attendance percentage

📴 Works fully offline

📱 Installable as a mobile app (PWA)

👤 Optional local profile (avatar + name)

All data is stored locally on the device using localStorage.

⚠️ Disclaimer

This project was built using vibe coding.

Idea & logic design: ChatGPT

Code generation & refinement: Google Antigravity tool

Purpose: Learning + personal use + helping friends

No backend, no server storage, no data collection.

🚀 How to Run (Local)
Requirements

Python installed

Steps
cd Attendance project
.\start_server.bat


Then open:

http://127.0.0.1:8000

📲 How to Install on Mobile
✅ Android

Open the link in Chrome

If install popup appears → tap Install

If not:

Tap ⋮ (three dots)

Tap Add to Home Screen

🍎 iOS (iPhone / iPad)

⚠️ Chrome will NOT work

Open the link in Safari

Tap Share (⬆️)

Tap Add to Home Screen

🧩 How to Adapt for Your Department / Timetable

This app supports multiple departments using the same codebase.

What you need to do:

Send your official timetable (image / PDF)

Mention:

Department name

Electives (if any)

Batch splits (if any)

Then use a change-only AI prompt like:
Apply timetable logic for <DEPARTMENT NAME>
based on the provided timetable.

Split continuous blocks into exact 50-minute periods.
Ensure labs and long classes are counted correctly.
Do NOT affect existing logic, UI, or attendance data.


The app can be extended without breaking existing departments.
