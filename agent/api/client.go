package api

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"time"
)

type Client struct {
	baseURL    string
	httpClient *http.Client
}

type AgentRegistration struct {
	AgentID      string `json:"agent_id"`
	Hostname     string `json:"hostname"`
	IPAddress    string `json:"ip_address"`
	OS           string `json:"os"`
	OSVersion    string `json:"os_version"`
	Username     string `json:"username"`
	AgentVersion string `json:"agent_version"`
}

type Metrics struct {
	AgentID         string  `json:"agent_id"`
	CPUUsage        float64 `json:"cpu_usage"`
	RAMUsage        float64 `json:"ram_usage"`
	DiskUsage       float64 `json:"disk_usage"`
	NetworkDownload float64 `json:"network_download"`
	NetworkUpload   float64 `json:"network_upload"`
}

type FileEvent struct {
	AgentID       string  `json:"agent_id"`
	FileName      string  `json:"file_name"`
	FilePath      string  `json:"file_path"`
	FileExtension string  `json:"file_extension"`
	EventType     string  `json:"event_type"`
	FileSize      *int64  `json:"file_size"`
	Username      *string `json:"username"`
}

type FilePolicy struct {
	ID        int    `json:"id"`
	Name      string `json:"name"`
	Extension string `json:"extension"`
	Action    string `json:"action"`
	Enabled   bool   `json:"enabled"`
}

type USBEvent struct {
	IPAddress string `json:"ip_address"`
	EventType string `json:"event_type"`
}

func NewClient(baseURL string, timeout time.Duration) *Client {
	return &Client{
		baseURL:    strings.TrimRight(baseURL, "/"),
		httpClient: &http.Client{Timeout: timeout},
	}
}

func (client *Client) RegisterAgent(registration AgentRegistration) error {
	return client.postJSON("/api/agents/register", registration)
}

func (client *Client) SendMetrics(metrics Metrics) error {
	return client.postJSON("/api/metrics", metrics)
}

func (client *Client) SendFileEvent(event FileEvent) error {
	return client.postJSON("/api/file-events", event)
}

func (client *Client) SendUSBEvent(event USBEvent) error {
	return client.postJSON("/api/usb-events", event)
}

func (client *Client) GetFilePolicies(agentID string) ([]FilePolicy, error) {
	request, err := http.NewRequest(
		http.MethodGet,
		client.baseURL+"/api/agents/"+url.PathEscape(agentID)+"/file-policies",
		nil,
	)
	if err != nil {
		return nil, fmt.Errorf("create policy request: %w", err)
	}

	response, err := client.httpClient.Do(request)
	if err != nil {
		return nil, fmt.Errorf("policy request failed: %w", err)
	}

	defer response.Body.Close()

	if response.StatusCode < http.StatusOK ||
		response.StatusCode >= http.StatusMultipleChoices {
		return nil, fmt.Errorf(
			"policy backend returned HTTP %d",
			response.StatusCode,
		)
	}

	var payload struct {
		Policies []FilePolicy `json:"policies"`
	}

	if err := json.NewDecoder(response.Body).Decode(&payload); err != nil {
		return nil, fmt.Errorf("decode policies: %w", err)
	}

	return payload.Policies, nil
}

func (client *Client) postJSON(path string, payload interface{}) error {
	body, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("encode request: %w", err)
	}

	fmt.Printf("DEBUG JSON: %s\n", string(body))

	request, err := http.NewRequest(
		http.MethodPost,
		client.baseURL+path,
		bytes.NewReader(body),
	)
	if err != nil {
		return fmt.Errorf("create request: %w", err)
	}

	request.Header.Set("Content-Type", "application/json")

	response, err := client.httpClient.Do(request)
	if err != nil {
		return fmt.Errorf("request failed: %w", err)
	}

	defer response.Body.Close()

	if response.StatusCode < http.StatusOK ||
		response.StatusCode >= http.StatusMultipleChoices {
		return fmt.Errorf(
			"backend returned HTTP %d",
			response.StatusCode,
		)
	}

	return nil
}
