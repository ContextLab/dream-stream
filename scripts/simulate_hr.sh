#!/bin/bash
# Simulate varying heart rate on WearOS emulator
# Usage: ./simulate_hr.sh [duration_seconds] [base_hr]

DURATION=${1:-60}
BASE_HR=${2:-65}
AUTH_TOKEN=$(cat ~/.emulator_console_auth_token)
END_TIME=$((SECONDS + DURATION))

echo "Simulating heart rate on WearOS emulator for ${DURATION}s (base: ${BASE_HR} BPM)"
echo "Press Ctrl+C to stop"

send_hr() {
    local hr=$1
    (echo "auth $AUTH_TOKEN"; sleep 0.2; echo "sensor set heart-rate $hr"; sleep 0.2; echo "quit") | nc -q 1 localhost 5556 > /dev/null 2>&1
    echo "HR: $hr BPM"
}

while [ $SECONDS -lt $END_TIME ]; do
    # Simulate sleep-like HR pattern with some variability
    CYCLE=$((SECONDS % 30))
    
    if [ $CYCLE -lt 10 ]; then
        # Deeper sleep - lower HR
        HR=$((BASE_HR - 5 + RANDOM % 3))
    elif [ $CYCLE -lt 20 ]; then
        # Light sleep - moderate HR  
        HR=$((BASE_HR + RANDOM % 5))
    else
        # REM-like - slightly elevated and variable
        HR=$((BASE_HR + 5 + RANDOM % 8))
    fi
    
    send_hr $HR
    sleep 2
done

echo "Simulation complete"
