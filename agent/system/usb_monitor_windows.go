//go:build windows

package system

import (
	"context"
	"fmt"
	"os/exec"
	"strings"
	"time"

	"endpoint-agent/api"
	"endpoint-agent/logger"
)

func StartUSBMonitor(ctx context.Context, client *api.Client) error {
	logger.Infof("USB storage monitor started")

	previousState := usbStorageConnected()

	logger.Infof(
		"USB initial state: %v",
		previousState,
	)

	ticker := time.NewTicker(2 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			currentState := usbStorageConnected()

			logger.Infof(
				"USB state check: previous=%v current=%v",
				previousState,
				currentState,
			)

			if currentState && !previousState {
				logger.Infof("USB connection detected")

				if err := sendUSBEvent(client, "connected"); err != nil {
					logger.Errorf(
						"Failed to send USB connected event: %v",
						err,
					)
				} else {
					logger.Infof("USB Connected event sent")
				}
			}

			if !currentState && previousState {
				logger.Infof("USB disconnection detected")

				if err := sendUSBEvent(client, "disconnected"); err != nil {
					logger.Errorf(
						"Failed to send USB disconnected event: %v",
						err,
					)
				} else {
					logger.Infof("USB Disconnected event sent")
				}
			}

			previousState = currentState

		case <-ctx.Done():
			logger.Infof("USB storage monitor stopped")
			return nil
		}
	}
}

func usbStorageConnected() bool {
	cmd := exec.Command(
		"powershell.exe",
		"-NoProfile",
		"-NonInteractive",
		"-Command",
		`@(Get-Disk | Where-Object { $_.BusType -eq 'USB' -and $_.OperationalStatus -eq 'Online' }).Count`,
	)

	output, err := cmd.Output()
	if err != nil {
		logger.Errorf("USB detection command failed: %v", err)
		return false
	}

	count := strings.TrimSpace(string(output))

	logger.Infof("USB disk count: %s", count)

	return count != "" && count != "0"
}

func sendUSBEvent(client *api.Client, eventType string) error {
	ipAddress := IPAddress()

	if ipAddress == "" {
		return fmt.Errorf("could not determine IP address")
	}

	event := api.USBEvent{
		IPAddress: ipAddress,
		EventType: eventType,
	}

	return client.SendUSBEvent(event)
}
