@echo off
setlocal EnableDelayedExpansion

set "startDir=%cd%"

for /f "delims=" %%D in ('dir /ad /b /s "%startDir%" ^| findstr /V /I "\\node_modules\\ \\.\git\\"') do (
    set "folder=%%~fD"
    echo Folder: !folder!
    for %%F in ("!folder!\*") do (
        if exist "%%F" (
            echo     File: %%~nxF
        )
    )
)
