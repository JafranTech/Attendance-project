@echo off
echo Starting Attendance App Server...
echo Open your browser to: http://127.0.0.1:8000
python -m http.server 8000 --bind 127.0.0.1
pause
