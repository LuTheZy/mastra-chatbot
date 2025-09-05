# Mastra Development Cleanup Script
# Targets only Mastra-related processes instead of all Node processes

Write-Host "🧹 Cleaning up Mastra development environment..." -ForegroundColor Yellow

# Function to safely stop Mastra processes
function Stop-MastraProcesses {
    # Find processes running from this project directory
    $currentPath = Get-Location
    
    # Get Node processes that might be Mastra-related
    $nodeProcesses = Get-WmiObject Win32_Process | Where-Object {
        $_.Name -eq "node.exe" -and 
        ($_.CommandLine -like "*mastra*" -or 
         $_.CommandLine -like "*$currentPath*" -or
         $_.CommandLine -like "*.mastra*")
    }
    
    if ($nodeProcesses) {
        Write-Host "Found Mastra-related processes:" -ForegroundColor Cyan
        foreach ($process in $nodeProcesses) {
            Write-Host "  PID $($process.ProcessId): $($process.CommandLine)" -ForegroundColor Gray
            try {
                Stop-Process -Id $process.ProcessId -Force -ErrorAction SilentlyContinue
                Write-Host "    ✅ Stopped process $($process.ProcessId)" -ForegroundColor Green
            } catch {
                Write-Host "    ❌ Failed to stop process $($process.ProcessId)" -ForegroundColor Red
            }
        }
    } else {
        Write-Host "No Mastra-related processes found" -ForegroundColor Green
    }
}

# Function to safely remove locked directories
function Remove-LockedDirectory {
    param($path)
    
    if (Test-Path $path) {
        Write-Host "Attempting to remove: $path" -ForegroundColor Cyan
        
        # Wait a moment for processes to fully terminate
        Start-Sleep -Seconds 2
        
        # Try multiple removal strategies
        $attempts = @(
            { Remove-Item $path -Recurse -Force -ErrorAction Stop },
            { cmd /c "rmdir /s /q `"$path`"" 2>$null },
            { 
                # Use PowerShell's more aggressive removal
                Get-ChildItem $path -Recurse | Remove-Item -Force -Recurse -ErrorAction SilentlyContinue
                Remove-Item $path -Force -ErrorAction Stop 
            }
        )
        
        foreach ($attempt in $attempts) {
            try {
                & $attempt
                Write-Host "    ✅ Successfully removed directory" -ForegroundColor Green
                return $true
            } catch {
                Write-Host "    ⚠️  Attempt failed: $($_.Exception.Message)" -ForegroundColor Yellow
                Start-Sleep -Seconds 1
            }
        }
        
        Write-Host "    ❌ Could not remove directory. May need manual intervention." -ForegroundColor Red
        return $false
    }
}

# Main cleanup process
Stop-MastraProcesses

# Clean up Mastra directories
$mastraOutput = ".\.mastra\output"
$mastraCache = ".\.mastra\cache"
$nodeModulesCache = ".\node_modules\.cache"

Remove-LockedDirectory $mastraOutput
Remove-LockedDirectory $mastraCache  
Remove-LockedDirectory $nodeModulesCache

Write-Host ""
Write-Host "🎉 Cleanup complete! You can now run 'npm run dev' safely." -ForegroundColor Green
Write-Host ""
Write-Host "💡 Tip: Run this script whenever you encounter the EBUSY error" -ForegroundColor Blue