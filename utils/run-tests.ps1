# NoBullFit Test Runner Script
# This script toggles to test environment, runs tests, and restores dev environment

param(
    [string]$TestPattern = "",
    [switch]$Verbose = $false,
    [switch]$IgnoreWarnings = $false,
    [switch]$Help = $false
)

# Function to display help
function Show-Help {
    Write-ColorOutput "NoBullFit Test Runner" "Magenta"
    Write-ColorOutput "====================" "Magenta"
    Write-ColorOutput ""
    Write-ColorOutput "Usage: .\utils\run-tests.ps1 [OPTIONS]" "White"
    Write-ColorOutput ""
    Write-ColorOutput "Options:" "White"
    Write-ColorOutput "  -TestPattern <pattern>  Run only tests matching the pattern" "Cyan"
    Write-ColorOutput "  -Verbose               Run tests with verbose output" "Cyan"
    Write-ColorOutput "  -IgnoreWarnings        Ignore warning messages during tests" "Cyan"
    Write-ColorOutput "  -Help                  Show this help message" "Cyan"
    Write-ColorOutput ""
    Write-ColorOutput "Examples:" "White"
    Write-ColorOutput "  .\utils\run-tests.ps1                    # Run all tests" "Green"
    Write-ColorOutput "  .\utils\run-tests.ps1 -Verbose           # Run all tests with verbose output" "Green"
    Write-ColorOutput "  .\utils\run-tests.ps1 -TestPattern user  # Run only tests matching 'user'" "Green"
    Write-ColorOutput "  .\utils\run-tests.ps1 -IgnoreWarnings    # Run tests ignoring warnings" "Green"
    Write-ColorOutput ""
    Write-ColorOutput "This script will:" "White"
    Write-ColorOutput "  1. Save current MIX_ENV" "Yellow"
    Write-ColorOutput "  2. Set MIX_ENV to 'test'" "Yellow"
    Write-ColorOutput "  3. Setup test database" "Yellow"
    Write-ColorOutput "  4. Run tests" "Yellow"
    Write-ColorOutput "  5. Restore original MIX_ENV" "Yellow"
}

# Function to display colored output
function Write-ColorOutput {
    param(
        [string]$Message,
        [string]$Color = "White"
    )
    Write-Host $Message -ForegroundColor $Color
}

# Show help if requested
if ($Help) {
    Show-Help
    exit 0
}

# Function to check if we're in the correct directory
function Test-ProjectDirectory {
    if (-not (Test-Path "mix.exs")) {
        Write-ColorOutput "Error: mix.exs not found. Please run this script from the project root directory." "Red"
        exit 1
    }
}

# Function to get current MIX_ENV
function Get-CurrentMixEnv {
    if ($env:MIX_ENV) {
        return $env:MIX_ENV
    } else {
        return "dev"
    }
}

# Function to set MIX_ENV
function Set-MixEnv {
    param([string]$Environment)
    $env:MIX_ENV = $Environment
    Write-ColorOutput "MIX_ENV set to: $Environment" "Green"
}

# Function to setup test database
function Initialize-TestDatabase {
    param([bool]$SuppressWarnings = $false)
    
    Write-ColorOutput "Setting up test database..." "Yellow"
    
    # Reset and setup test database
    if ($SuppressWarnings) {
        $tempFile = [System.IO.Path]::GetTempFileName()
        try {
            Invoke-Expression "mix ecto.reset > `"$tempFile`" 2>&1"
            $setupResult = $LASTEXITCODE
            $output = Get-Content $tempFile | Where-Object { 
                $_ -notmatch "warning:" -and $_ -notmatch "redefining module"
            }
            $output | ForEach-Object { Write-Host $_ }
        } finally {
            if (Test-Path $tempFile) { Remove-Item $tempFile -Force }
        }
    } else {
        $setupResult = Invoke-Expression "mix ecto.reset"
        $setupResult = $LASTEXITCODE
    }
    
    if ($setupResult -ne 0) {
        Write-ColorOutput "Warning: Database reset failed, trying to create database..." "Yellow"
        if ($SuppressWarnings) {
            $tempFile = [System.IO.Path]::GetTempFileName()
            try {
                Invoke-Expression "mix ecto.create > `"$tempFile`" 2>&1"
                $createResult = $LASTEXITCODE
                $output = Get-Content $tempFile | Where-Object { 
                    $_ -notmatch "warning:" -and $_ -notmatch "redefining module"
                }
                $output | ForEach-Object { Write-Host $_ }
            } finally {
                if (Test-Path $tempFile) { Remove-Item $tempFile -Force }
            }
        } else {
            $createResult = Invoke-Expression "mix ecto.create"
            $createResult = $LASTEXITCODE
        }
        
        if ($createResult -ne 0) {
            Write-ColorOutput "Warning: Database creation failed, trying to migrate..." "Yellow"
            if ($SuppressWarnings) {
                $tempFile = [System.IO.Path]::GetTempFileName()
                try {
                    Invoke-Expression "mix ecto.migrate > `"$tempFile`" 2>&1"
                    $migrateResult = $LASTEXITCODE
                    $output = Get-Content $tempFile | Where-Object { 
                        $_ -notmatch "warning:" -and $_ -notmatch "redefining module"
                    }
                    $output | ForEach-Object { Write-Host $_ }
                } finally {
                    if (Test-Path $tempFile) { Remove-Item $tempFile -Force }
                }
            } else {
                $migrateResult = Invoke-Expression "mix ecto.migrate"
                $migrateResult = $LASTEXITCODE
            }
            
            if ($migrateResult -ne 0) {
                Write-ColorOutput "Error: Failed to setup test database" "Red"
                return $false
            }
        }
    }
    
    Write-ColorOutput "Test database setup completed" "Green"
    return $true
}

# Function to run tests
function Invoke-Tests {
    param([string]$Pattern)
    
    Write-ColorOutput "Running tests..." "Yellow"
    
    # Setup test database first
    if (-not (Initialize-TestDatabase -SuppressWarnings $IgnoreWarnings)) {
        return 1
    }
    
    if ($Pattern) {
        Write-ColorOutput "Test pattern: $Pattern" "Cyan"
        $testCommand = "mix test --only pattern:$Pattern"
    } else {
        $testCommand = "mix test"
    }
    
    if ($Verbose) {
        $testCommand += " --trace"
    }
    
    if ($IgnoreWarnings) {
        $testCommand += " --no-all-warnings"
        Write-ColorOutput "Warning messages will be suppressed" "Yellow"
    }
    
    Write-ColorOutput "Executing: $testCommand" "Cyan"
    Write-ColorOutput "Running comprehensive test suite for NoBullFit application..." "Blue"
    
    # Execute the test command
    if ($IgnoreWarnings) {
        # Use a temporary file to capture output and filter warnings
        $tempFile = [System.IO.Path]::GetTempFileName()
        try {
            # Execute command and redirect all output to temp file
            Invoke-Expression "$testCommand > `"$tempFile`" 2>&1"
            $testResult = $LASTEXITCODE
            
            # Read and filter the output
            $output = Get-Content $tempFile | Where-Object { 
                $_ -notmatch "warning:" -and 
                $_ -notmatch "redefining module" -and
                $_ -notmatch "Maintenance mode enabled" -and
                $_ -notmatch "Maintenance mode disabled" -and
                $_ -notmatch "Message:" -and
                $_ -notmatch "Prevent login:" -and
                $_ -notmatch "Prevent registration:" -and
                $_ -notmatch "Maintenance Status:" -and
                $_ -notmatch "Enabled:" -and
                $_ -notmatch "Latest maintenance setting:" -and
                $_ -notmatch "No maintenance settings found"
            }
            
            # Display filtered output
            $output | ForEach-Object { Write-Host $_ }
        } finally {
            # Clean up temp file
            if (Test-Path $tempFile) {
                Remove-Item $tempFile -Force
            }
        }
    } else {
        # Always show full output when not suppressing warnings
        # Use Start-Process to ensure output is displayed
        $process = Start-Process -FilePath "cmd" -ArgumentList "/c", $testCommand -Wait -PassThru -NoNewWindow
        $testResult = $process.ExitCode
    }
    
    # If tests failed, show additional context
    if ($testResult -ne 0) {
        Write-ColorOutput "Test execution completed with errors. Check the output above for details." "Yellow"
    }
    
    if ($testResult -eq 0) {
        Write-ColorOutput "Tests completed successfully!" "Green"
    } else {
        Write-ColorOutput "Tests failed with exit code: $testResult" "Red"
        Write-ColorOutput "Check the output above for specific test failures" "Red"
    }
    
    return $testResult
}

# Main execution
try {
    Write-ColorOutput "=== NoBullFit Test Runner ===" "Magenta"
    Write-ColorOutput ""
    
    # Check if we're in the correct directory
    Test-ProjectDirectory
    
    # Store original environment
    $originalEnv = Get-CurrentMixEnv
    Write-ColorOutput "Original MIX_ENV: $originalEnv" "Cyan"
    
    # Set environment to test
    Set-MixEnv "test"
    
    # Run tests
    $testExitCode = Invoke-Tests -Pattern $TestPattern
    
    # Restore original environment
    Write-ColorOutput ""
    Write-ColorOutput "Restoring MIX_ENV to: $originalEnv" "Yellow"
    Set-MixEnv $originalEnv
    
    Write-ColorOutput ""
    Write-ColorOutput "=== Test Run Complete ===" "Magenta"
    
    # Exit with the same code as the tests
    exit $testExitCode
    
} catch {
    Write-ColorOutput "Error occurred: $($_.Exception.Message)" "Red"
    
    # Try to restore environment even if there was an error
    if ($originalEnv) {
        Write-ColorOutput "Attempting to restore MIX_ENV to: $originalEnv" "Yellow"
        Set-MixEnv $originalEnv
    }
    
    exit 1
}
