📱 Student Attendance Tracker (PWA)

A mobile-first, offline Progressive Web App (PWA) that helps students track their daily attendance accurately based on timetable, electives, batch, and period-wise classes.

⚠️ This is a personal self-attendance tracking tool, not an official college attendance system.

✨ Features

📅 Period-based attendance (each 50-minute period counted separately)

🧠 Smart timetable handling

Long lab blocks split into multiple periods

Batch-wise subject rotation

🎓 Elective & batch selection at first setup

🎉 Manual Holiday marking

Holidays are excluded from attendance calculation

📊 Subject-wise & overall attendance percentage

📴 Fully offline (LocalStorage)

📱 Installable as a mobile app (PWA)

👤 Optional local profile (avatar + name)

⚠️ Disclaimer

This project was built using vibe coding.

Idea & system design: ChatGPT

Code generation & refinement: Google Antigravity tool

Purpose: Learning, experimentation, and personal use with friends

No backend. No cloud storage. No data collection.

🚀 How to Run Locally
Requirements

Python installed on your system

Steps
cd Attendance project
.\start_server.bat


Then open in browser:

http://127.0.0.1:8000

📲 Install on Mobile (PWA)
🤖 Android

Open the app link in Chrome

If an install popup appears → tap Install

If not:

Tap ⋮ (three dots)

Tap Add to Home Screen

🍎 iOS (iPhone / iPad)

⚠️ Chrome does NOT support PWA install on iOS

Open the app link in Safari

Tap Share (⬆️)

Tap Add to Home Screen

🧩 Adapting for Other Departments / Timetables

This project is designed to be extensible.

You can reuse the same codebase for other departments.

What is needed:

Official timetable (image or PDF)

Department name

Details about:

Electives

Batch splits

Lab / long blocks

Example AI Prompt for Customization

prompt:


*Apply timetable logic for <DEPARTMENT NAME> based on the provided timetable.*

*Split continuous blocks into exact 50-minute periods.*
*Ensure labs and long classes are counted correctly.*
*Do NOT modify existing UI, logic, or attendance data.*

🔐 Privacy & Data Safety

✅ No login / signup*

✅ No server or backend

✅ No internet required after install

✅ All data stored locally on the device

Your attendance data stays with you.

🏁 Project Status

✅ Stable

✅ Accurate

✅ Offline-ready

✅ Mobile-friendly

✅ Real-world usable

Built by a student, for students.
