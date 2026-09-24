package system

import (
	"context"
	"encoding/json"
	"fmt"
	"os/exec"
	"strings"
	"time"

	"endpoint-agent/api"
)

type powershellProcess struct {
	ProcessID   int    `json:"ProcessId"`
	Name        string `json:"Name"`
	CommandLine string `json:"CommandLine"`
}

func StartThreatMonitor(
	ctx context.Context,
	client *api.Client,
	agentID string,
) error {

	ticker := time.NewTicker(5 * time.Second)
	defer ticker.Stop()

	// Prevent sending the same process repeatedly.
	seen := make(map[string]time.Time)

	for {
		select {

		case <-ticker.C:

			processes, err := getPowerShellProcesses()
			if err != nil {
				continue
			}

			now := time.Now()

			for _, process := range processes {

				if process.CommandLine == "" {
					continue
				}

				if !isSuspiciousPowerShell(
					process.CommandLine,
				) {
					continue
				}

				eventKey := fmt.Sprintf(
					"%d|%s",
					process.ProcessID,
					process.CommandLine,
				)

				lastSent, exists := seen[eventKey]

				if exists &&
					now.Sub(lastSent) < 30*time.Minute {
					continue
				}

				seen[eventKey] = now

				if err := sendThreatEvent(
					client,
					agentID,
					process,
				); err != nil {
					continue
				}
			}

			// Remove old entries.
			for key, timestamp := range seen {
				if now.Sub(timestamp) > 2*time.Hour {
					delete(seen, key)
				}
			}

		case <-ctx.Done():
			return nil
		}
	}
}

func getPowerShellProcesses() (
	[]powershellProcess,
	error,
) {

	command := `
$items = @(
    Get-CimInstance Win32_Process |
    Where-Object {
        $_.Name -ieq 'powershell.exe' -or
        $_.Name -ieq 'pwsh.exe'
    } |
    Select-Object ProcessId, Name, CommandLine
)

if ($items.Count -eq 0) {
    exit 0
}

$items | ConvertTo-Json -Compress
`

	output, err := exec.Command(
		"powershell.exe",
		"-NoProfile",
		"-NonInteractive",
		"-Command",
		command,
	).Output()

	if err != nil {
		return nil, err
	}

	outputText := strings.TrimSpace(
		string(output),
	)

	if outputText == "" {
		return nil, nil
	}

	// One PowerShell process.
	if strings.HasPrefix(outputText, "{") {

		var process powershellProcess

		if err := json.Unmarshal(
			[]byte(outputText),
			&process,
		); err != nil {
			return nil, err
		}

		return []powershellProcess{
			process,
		}, nil
	}

	// Multiple PowerShell processes.
	var processes []powershellProcess

	if err := json.Unmarshal(
		[]byte(outputText),
		&processes,
	); err != nil {
		return nil, err
	}

	return processes, nil
}

func isSuspiciousPowerShell(
	commandLine string,
) bool {

	value := strings.ToLower(
		commandLine,
	)

	patterns := []string{
		"-enc ",
		"-encodedcommand ",
		"-executionpolicy bypass",
		"-ep bypass",
		"-windowstyle hidden",
		"-w hidden",
		"downloadstring(",
		"downloadfile(",
		"invoke-expression",
		"frombase64string",
		"reflection.assembly",
		"invoke-webrequest",
	}

	for _, pattern := range patterns {

		if strings.Contains(
			value,
			pattern,
		) {
			return true
		}
	}

	return false
}

func sendThreatEvent(
	client *api.Client,
	agentID string,
	process powershellProcess,
) error {

	payload := api.ThreatEvent{
		AgentID:     agentID,
		ThreatType:  "suspicious_powershell",
		Severity:    "high",
		Title:       "Suspicious PowerShell execution",
		Description: "PowerShell command matched a suspicious execution pattern",
		ProcessName: process.Name,
		CommandLine: process.CommandLine,
		Username:    Username(),
		IPAddress:   IPAddress(),
		Status:      "open",
	}

	return client.SendThreatEvent(payload)
}
