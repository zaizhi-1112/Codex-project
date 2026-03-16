@echo off
setlocal EnableExtensions EnableDelayedExpansion

if "%~1"=="-h" goto :help
if "%~1"=="--help" goto :help
if "%~1"=="/?" goto :help

if "%~1"=="" (
  call :interactive
) else (
  call :from_args %*
)
goto :eof

:help
echo Video to GIF tool ^(requires ffmpeg in PATH^)
echo.
echo Usage:
echo   video_to_gif.bat input.mp4 [output.gif] [start] [duration] [width] [fps] [quality]
echo.
echo Args:
echo   input      Source video file path
echo   output     Output GIF path ^(default: input name + .gif^)
echo   start      Start time ^(default: 00:00:00^)
echo   duration   Clip duration in seconds ^(default: 5^)
echo   width      Output width, use iw for original width ^(default: 480^)
echo   fps        GIF fps ^(default: 12^)
echo   quality    high ^| medium ^| low ^(default: medium^)
echo.
echo Example:
echo   video_to_gif.bat demo.mp4 demo.gif 00:00:03 4 360 10 high
exit /b 0

:interactive
echo Video to GIF tool
echo.
set /p "INPUT=Input video path: "
if not defined INPUT (
  echo [ERROR] Input path is required.
  exit /b 1
)

for %%I in ("%INPUT%") do set "DEFAULT_OUTPUT=%%~dpnI.gif"
set /p "OUTPUT=Output GIF path (default: !DEFAULT_OUTPUT!): "
if not defined OUTPUT set "OUTPUT=!DEFAULT_OUTPUT!"

set /p "START=Start time (default: 00:00:00): "
if not defined START set "START=00:00:00"

set /p "DURATION=Duration in seconds (default: 5): "
if not defined DURATION set "DURATION=5"

set /p "WIDTH=Output width (default: 480, use iw for source width): "
if not defined WIDTH set "WIDTH=480"

set /p "FPS=FPS (default: 12): "
if not defined FPS set "FPS=12"

set /p "QUALITY=Quality mode high/medium/low (default: medium): "
if not defined QUALITY set "QUALITY=medium"

call :convert
exit /b %ERRORLEVEL%

:from_args
set "INPUT=%~1"
set "OUTPUT=%~2"
set "START=%~3"
set "DURATION=%~4"
set "WIDTH=%~5"
set "FPS=%~6"
set "QUALITY=%~7"

if not defined INPUT (
  echo [ERROR] Input path is required.
  exit /b 1
)

if not defined OUTPUT (
  for %%I in ("%INPUT%") do set "OUTPUT=%%~dpnI.gif"
)
if not defined START set "START=00:00:00"
if not defined DURATION set "DURATION=5"
if not defined WIDTH set "WIDTH=480"
if not defined FPS set "FPS=12"
if not defined QUALITY set "QUALITY=medium"

call :convert
exit /b %ERRORLEVEL%

:convert
if not exist "%INPUT%" (
  echo [ERROR] Input file not found: %INPUT%
  exit /b 1
)

ffmpeg -version >nul 2>&1
if errorlevel 1 (
  echo [ERROR] ffmpeg is not found in PATH.
  echo         Install ffmpeg and make sure "ffmpeg" is available in your terminal.
  exit /b 1
)

set "PALETTE_FILE=%TEMP%\palette_%RANDOM%_%RANDOM%.png"

set "PALETTE_USE=paletteuse=dither=bayer:bayer_scale=3"
if /I "%QUALITY%"=="high" set "PALETTE_USE=paletteuse=dither=sierra2_4a"
if /I "%QUALITY%"=="low" set "PALETTE_USE=paletteuse=dither=none"

echo.
echo [1/2] Generating palette...
ffmpeg -v warning -y -ss %START% -t %DURATION% -i "%INPUT%" ^
  -vf "fps=%FPS%,scale=%WIDTH%:-1:flags=lanczos,palettegen=stats_mode=diff" "%PALETTE_FILE%"
if errorlevel 1 (
  echo [ERROR] Failed to generate palette.
  if exist "%PALETTE_FILE%" del /q "%PALETTE_FILE%" >nul 2>&1
  exit /b 1
)

echo [2/2] Rendering GIF...
ffmpeg -v warning -y -ss %START% -t %DURATION% -i "%INPUT%" -i "%PALETTE_FILE%" ^
  -lavfi "fps=%FPS%,scale=%WIDTH%:-1:flags=lanczos[x];[x][1:v]%PALETTE_USE%" "%OUTPUT%"
set "FFMPEG_CODE=%ERRORLEVEL%"

if exist "%PALETTE_FILE%" del /q "%PALETTE_FILE%" >nul 2>&1

if not "%FFMPEG_CODE%"=="0" (
  echo [ERROR] GIF conversion failed.
  exit /b %FFMPEG_CODE%
)

echo [DONE] GIF saved to: %OUTPUT%
exit /b 0
