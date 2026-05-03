@echo off
echo ========================================
echo   Tritux RH - Python Service
echo ========================================

cd /d "%~dp0"

if not exist "venv\Scripts\activate.bat" (
    echo Creation de l'environnement virtuel...
    python -m venv venv
)

echo Activation de l'environnement virtuel...
call venv\Scripts\activate.bat

echo Installation des dependances...
pip install -r requirements.txt --quiet

echo.
echo Service Python demarre sur http://localhost:8001
echo.
uvicorn main:app --port 8001 --reload
