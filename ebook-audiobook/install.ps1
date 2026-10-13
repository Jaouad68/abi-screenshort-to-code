# Installation de « Ebook vers livre audio » sous Windows.
# Crée un environnement Python isolé (.venv), installe les dépendances
# et télécharge les voix Piper hors ligne.
$ErrorActionPreference = "Continue"
Set-Location $PSScriptRoot

Write-Host "== Recherche de Python 3.10 a 3.13 ==" -ForegroundColor Cyan
$pyVersion = $null
foreach ($v in @("3.12", "3.13", "3.11", "3.10")) {
    try {
        & py "-$v" -c "import sys" 2>$null
        if ($LASTEXITCODE -eq 0) { $pyVersion = $v; break }
    } catch {}
}
if (-not $pyVersion) {
    Write-Host "Python est introuvable. Installez Python 3.12 depuis https://www.python.org/downloads/" -ForegroundColor Red
    Write-Host "(cochez 'Add python.exe to PATH' pendant l'installation), puis relancez Installer.bat."
    exit 1
}
Write-Host "Python $pyVersion trouve."

if (-not (Test-Path ".venv\Scripts\python.exe")) {
    Write-Host "== Creation de l'environnement .venv ==" -ForegroundColor Cyan
    & py "-$pyVersion" -m venv .venv
}
$venvPy = ".venv\Scripts\python.exe"

Write-Host "== Installation des dependances (quelques minutes) ==" -ForegroundColor Cyan
& $venvPy -m pip install --upgrade pip
& $venvPy -m pip install -r requirements.txt
if ($LASTEXITCODE -ne 0) { Write-Host "Echec de l'installation des dependances." -ForegroundColor Red; exit 1 }

Write-Host "== Telechargement des voix Piper (hors ligne, ~180 Mo) ==" -ForegroundColor Cyan
& $venvPy scripts\download_voices.py

Write-Host ""
Write-Host "Installation terminee !" -ForegroundColor Green
Write-Host "  - Lancer.bat           : utiliser l'application sur cet ordinateur"
Write-Host "  - Lancer-telephone.bat : l'utiliser aussi depuis le telephone (meme Wi-Fi)"
