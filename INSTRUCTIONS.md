# Student Attendance PWA

A clean, offline-first progressive web app for tracking student attendance.

## How to Run Locally

1. **Simple Server**:
   You need a local web server to test the PWA functionality (Service Workers require HTTP/HTTPS, they don't work on `file://`).
   
   If you have Python installed:
   ```bash
   python -m http.server
   ```
   Then open `http://localhost:8000`.

   If you have VS Code:
   - Install "Live Server" extension.
   - Right-click `index.html` > "Open with Live Server".

2. **First Time Setup**:
   - Open the app.
   - Select your Electives and Batch.
   - Click "Get Started".

3. **Install as App**:
   - **Chrome (Desktop)**: Click the Install icon in the address bar (right side).
   - **Mobile (Chrome/Safari)**: Tap "Share" or "Menu" -> "Add to Home Screen".

## Features
- **Offline Capable**: Works without internet after first load.
- **Auto-Timetable**: Filters classes based on your specific Electives and Batch.
- **Persistent Data**: Attendance is saved to your device.
- **Stats**: View your attendance percentage instantly.
