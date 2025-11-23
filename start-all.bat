@echo off
echo Stopping all Node.js processes...
taskkill /F /IM node.exe 2>nul
timeout /t 2 /nobreak > nul

echo.
echo Starting Smart Microservice Health Guardian...
echo.

echo [1/7] Starting Backend...
start "Backend" cmd /k "cd backend && npm run dev"
timeout /t 3 /nobreak > nul

echo [2/7] Starting Auth Service...
start "Auth Service" cmd /k "cd services\auth-service && node index.js"
timeout /t 2 /nobreak > nul

echo [3/7] Starting Booking Service...
start "Booking Service" cmd /k "cd services\booking-service && node index.js"
timeout /t 2 /nobreak > nul

echo [4/7] Starting Storage Service...
start "Storage Service" cmd /k "cd services\storage-service && node index.js"
timeout /t 2 /nobreak > nul

echo [5/7] Starting Frontend...
start "Frontend" cmd /k "cd frontend && npm run dev"
timeout /t 2 /nobreak > nul

echo [6/7] Starting Traffic Generator...
start "Traffic Generator" cmd /k "node traffic-generator.js"

echo.
echo ========================================
echo All services started successfully!
echo ========================================
echo.
echo Backend:          http://localhost:3000
echo Auth Service:     http://localhost:3001
echo Booking Service:  http://localhost:3002
echo Storage Service:  http://localhost:3003
echo Frontend:         http://localhost:5173
echo Traffic Generator: Running
echo.
echo Press any key to stop all services...
pause > nul

taskkill /FI "WindowTitle eq Backend*" /T /F
taskkill /FI "WindowTitle eq Auth Service*" /T /F
taskkill /FI "WindowTitle eq Booking Service*" /T /F
taskkill /FI "WindowTitle eq Storage Service*" /T /F
taskkill /FI "WindowTitle eq Frontend*" /T /F
taskkill /FI "WindowTitle eq Traffic Generator*" /T /F

echo All services stopped.
