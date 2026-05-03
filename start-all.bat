@echo off
echo ========================================
echo   Tritux RH - Demarrage complet
echo ========================================
echo.

echo [1/4] Demarrage Docker (PostgreSQL + n8n)...
docker-compose up -d
timeout /t 5 /nobreak >nul

echo [2/4] Demarrage du service Python...
start "Python Service" cmd /k "cd python-service && start.bat"
timeout /t 3 /nobreak >nul

echo [3/4] Demarrage du backend Spring Boot...
start "Spring Boot" cmd /k "cd backend && mvnw.cmd spring-boot:run"
timeout /t 3 /nobreak >nul

echo [4/4] Demarrage du frontend React...
start "React Frontend" cmd /k "cd frontend && npm install && npm start"

echo.
echo ========================================
echo   Services en cours de demarrage...
echo ========================================
echo   Frontend  : http://localhost:3000
echo   Backend   : http://localhost:9091
echo   Python    : http://localhost:8001
echo   n8n       : http://localhost:5678
echo   PostgreSQL: localhost:5432
echo ========================================
echo.
echo N'oubliez pas d'importer le workflow dans n8n !
echo Fichier : docker/n8n-workflow-tritux.json
echo.
pause
