package config

import (
	"os"
	"strconv"
	"time"
)

const (
	defaultAPIURL       = "http://192.168.1.42:3000"
	defaultAgentVersion = "1.0.0"
	defaultInterval     = 10 * time.Second
	defaultHTTPTimeout  = 5 * time.Second
	defaultAgentIDFile  = "agent-id"
)

type Config struct {
	APIURL       string
	AgentVersion string
	Interval     time.Duration
	HTTPTimeout  time.Duration
	AgentIDFile  string
}

func Load() Config {
	return Config{
		APIURL:       valueOrDefault("API_URL", defaultAPIURL),
		AgentVersion: valueOrDefault("AGENT_VERSION", defaultAgentVersion),
		Interval:     durationOrDefault("METRICS_INTERVAL_SECONDS", defaultInterval),
		HTTPTimeout:  defaultHTTPTimeout,
		AgentIDFile:  valueOrDefault("AGENT_ID_FILE", defaultAgentIDFile),
	}
}

func valueOrDefault(name, fallback string) string {
	if value := os.Getenv(name); value != "" {
		return value
	}
	return fallback
}

func durationOrDefault(name string, fallback time.Duration) time.Duration {
	value := os.Getenv(name)
	if value == "" {
		return fallback
	}

	seconds, err := strconv.Atoi(value)
	if err != nil || seconds <= 0 {
		return fallback
	}
	return time.Duration(seconds) * time.Second
}
