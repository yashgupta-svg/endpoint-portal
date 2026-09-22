package main

import (
	"context"
	"fmt"
	"os"
	"os/signal"
	"time"

	"endpoint-agent/api"
	"endpoint-agent/config"
	"endpoint-agent/logger"
	"endpoint-agent/system"

	"golang.org/x/sys/windows/svc"
)

const serviceName = "EndpointAgent"

type agentService struct{}

func (m *agentService) Execute(
	args []string,
	r <-chan svc.ChangeRequest,
	status chan<- svc.Status,
) (bool, uint32) {

	status <- svc.Status{
		State: svc.StartPending,
	}

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	go func() {
		for {
			select {
			case req := <-r:
				switch req.Cmd {
				case svc.Stop, svc.Shutdown:
					cancel()
					return

				case svc.Interrogate:
					status <- svc.Status{
						State:   svc.Running,
						Accepts: svc.AcceptStop | svc.AcceptShutdown,
					}
				}

			case <-ctx.Done():
				return
			}
		}
	}()

	status <- svc.Status{
		State:   svc.Running,
		Accepts: svc.AcceptStop | svc.AcceptShutdown,
	}

	runAgent(ctx)

	status <- svc.Status{
		State: svc.StopPending,
	}

	return false, 0
}

func main() {
	isService, err := svc.IsWindowsService()
	if err != nil {
		fmt.Printf("Failed to detect Windows Service mode: %v\n", err)
		os.Exit(1)
	}

	if isService {
		err := svc.Run(serviceName, &agentService{})
		if err != nil {
			fmt.Printf("Windows Service failed: %v\n", err)
			os.Exit(1)
		}
		return
	}

	// Normal terminal mode for testing.
	ctx, stop := signal.NotifyContext(
		context.Background(),
		os.Interrupt,
	)
	defer stop()

	runAgent(ctx)
}

func runAgent(ctx context.Context) {
	settings := config.Load()

	logger.Infof("Agent starting...")

	agentID, err := system.LoadOrCreateAgentID(settings.AgentIDFile)
	if err != nil {
		logger.Errorf("Failed to load agent ID: %v", err)
		return
	}

	logger.Infof("Agent ID: %s", agentID)
	logger.Infof("Backend: %s", settings.APIURL)

	client := api.NewClient(
		settings.APIURL,
		settings.HTTPTimeout,
	)

	policyStore := system.NewPolicyStore()

	// ------------------------------------
	// Agent Registration
	// ------------------------------------

	registration := api.AgentRegistration{
		AgentID:      agentID,
		Hostname:     system.Hostname(),
		IPAddress:    system.IPAddress(),
		OS:           system.OperatingSystem(),
		OSVersion:    system.OSVersion(),
		Username:     system.Username(),
		AgentVersion: settings.AgentVersion,
	}

	if err := client.RegisterAgent(registration); err != nil {
		logger.Errorf(
			"Failed to register agent: %v",
			err,
		)
	} else {
		logger.Infof("Registration successful")
	}

	// ------------------------------------
	// File Policy Refresh
	// ------------------------------------

	refreshPolicies := func() {
		policies, err := client.GetFilePolicies(agentID)
		if err != nil {
			logger.Errorf(
				"Failed to refresh file policies: %v",
				err,
			)
			return
		}

		policyStore.Replace(policies)

		logger.Infof(
			"File policies refreshed: %d active",
			len(policies),
		)
	}

	refreshPolicies()

	// ------------------------------------
	// File Monitor
	// ------------------------------------

	go func() {
		if err := system.StartFileMonitor(
			ctx,
			client,
			agentID,
			policyStore,
		); err != nil {
			logger.Errorf(
				"File monitor stopped: %v",
				err,
			)
		}
	}()

	// ------------------------------------
	// USB Storage Monitor
	// ------------------------------------

	go func() {
		if err := system.StartUSBMonitor(
			ctx,
			client,
		); err != nil {
			logger.Errorf(
				"USB monitor stopped: %v",
				err,
			)
		}
	}()

	// ------------------------------------
	// Initial Metrics
	// ------------------------------------

	sendMetrics(client, agentID)

	// ------------------------------------
	// Metrics Timer
	// ------------------------------------

	ticker := time.NewTicker(settings.Interval)
	defer ticker.Stop()

	// ------------------------------------
	// File Policy Refresh Timer
	// ------------------------------------

	policyTicker := time.NewTicker(
		2 * time.Minute,
	)
	defer policyTicker.Stop()

	// ------------------------------------
	// Main Agent Loop
	// ------------------------------------

	for {
		select {

		case <-ticker.C:
			sendMetrics(client, agentID)

		case <-policyTicker.C:
			refreshPolicies()

		case <-ctx.Done():
			logger.Infof("Agent stopping")
			return
		}
	}
}

func sendMetrics(
	client *api.Client,
	agentID string,
) {
	values, err := system.CollectMetrics()
	if err != nil {
		logger.Errorf(
			"Failed to collect metrics: %v",
			err,
		)
		return
	}

	payload := api.Metrics{
		AgentID:         agentID,
		CPUUsage:        values.CPUUsage,
		RAMUsage:        values.RAMUsage,
		DiskUsage:       values.DiskUsage,
		NetworkDownload: values.NetworkDownload,
		NetworkUpload:   values.NetworkUpload,
	}

	if err := client.SendMetrics(payload); err != nil {
		logger.Errorf(
			"Failed to send metrics: %v",
			err,
		)
		return
	}

	logger.Infof(
		"Metrics sent successfully - CPU: %.1f%% RAM: %.1f%% Disk: %.1f%% Network download: %.2f MB/s upload: %.2f MB/s",
		payload.CPUUsage,
		payload.RAMUsage,
		payload.DiskUsage,
		payload.NetworkDownload,
		payload.NetworkUpload,
	)
}
