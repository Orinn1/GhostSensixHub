@echo off
title GhostSensix Dev Server (Port 3001)
powershell.exe -ExecutionPolicy Bypass -File "%~dp0server.ps1" -Port 3001
pause

