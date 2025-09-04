@echo off
echo Gentle cleanup of .mastra cache...

REM Only target the specific locked directory
if exist ".mastra\output" (
    echo Removing .mastra\output directory...
    rmdir /s /q ".mastra\output" >nul 2>&1
    if exist ".mastra\output" (
        echo Directory still locked, waiting and retrying...
        timeout /t 2 >nul
        rmdir /s /q ".mastra\output" >nul 2>&1
    )
)

REM Clean up other cache files safely
if exist ".mastra" (
    del /q ".mastra\*.log" >nul 2>&1
    del /q ".mastra\*.tmp" >nul 2>&1
)

echo ✅ Cache cleanup complete
echo Now try: npm run dev