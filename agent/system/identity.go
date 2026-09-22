package system

import (
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"net"
	"os"
	"os/exec"
	"os/user"
	"runtime"
	"strings"
)

const agentIDPrefix = "agent-"

func LoadOrCreateAgentID(path string) (string, error) {
	if contents, err := os.ReadFile(path); err == nil {
		id := strings.TrimSpace(string(contents))
		if strings.HasPrefix(id, agentIDPrefix) && len(id) > len(agentIDPrefix) {
			return id, nil
		}
	} else if !errors.Is(err, os.ErrNotExist) {
		return "", fmt.Errorf("read agent ID: %w", err)
	}

	bytes := make([]byte, 8)
	if _, err := rand.Read(bytes); err != nil {
		return "", fmt.Errorf("generate agent ID: %w", err)
	}
	id := agentIDPrefix + hex.EncodeToString(bytes)
	if err := os.WriteFile(path, []byte(id+"\n"), 0600); err != nil {
		return "", fmt.Errorf("save agent ID: %w", err)
	}
	return id, nil
}

func Hostname() string {
	name, err := os.Hostname()
	if err != nil {
		return "unknown-host"
	}
	return name
}

func Username() string {
	current, err := user.Current()
	if err != nil {
		return "unknown-user"
	}
	return current.Username
}

func IPAddress() string {
	if address := routeIPAddress(); address != "" {
		return address
	}

	interfaces, err := net.Interfaces()
	if err != nil {
		return "127.0.0.1"
	}

	var fallback string
	for _, networkInterface := range interfaces {
		if networkInterface.Flags&net.FlagUp == 0 || networkInterface.Flags&net.FlagLoopback != 0 {
			continue
		}
		if isVirtualInterface(networkInterface.Name) {
			continue
		}
		addresses, err := networkInterface.Addrs()
		if err != nil {
			continue
		}
		for _, address := range addresses {
			ip, _, err := net.ParseCIDR(address.String())
			if err == nil && isPrivateIPv4(ip) {
				fallback = ip.String()
			}
		}
	}
	if fallback != "" {
		return fallback
	}
	return "127.0.0.1"
}

func routeIPAddress() string {
	connection, err := net.Dial("udp", "8.8.8.8:80")
	if err != nil {
		return ""
	}
	defer connection.Close()

	localAddress, ok := connection.LocalAddr().(*net.UDPAddr)
	if ok && isPrivateIPv4(localAddress.IP) {
		return localAddress.IP.String()
	}
	return ""
}

func isPrivateIPv4(ip net.IP) bool {
	ip = ip.To4()
	if ip == nil || ip.IsLoopback() || ip.IsLinkLocalUnicast() {
		return false
	}
	return ip[0] == 10 ||
		(ip[0] == 172 && ip[1] >= 16 && ip[1] <= 31) ||
		(ip[0] == 192 && ip[1] == 168)
}

func isVirtualInterface(name string) bool {
	lowerName := strings.ToLower(name)
	for _, marker := range []string{"virtual", "vmware", "vbox", "hyper-v", "wsl", "loopback", "teredo", "tunnel"} {
		if strings.Contains(lowerName, marker) {
			return true
		}
	}
	return false
}

func OperatingSystem() string {
	switch runtime.GOOS {
	case "windows":
		return "Windows"
	case "linux":
		return "Linux"
	case "darwin":
		return "macOS"
	default:
		return runtime.GOOS
	}
}

func OSVersion() string {
	if runtime.GOOS == "windows" {
		output, err := exec.Command("cmd", "/c", "ver").Output()
		if err == nil && strings.TrimSpace(string(output)) != "" {
			return strings.TrimSpace(string(output))
		}
	}
	if runtime.GOOS == "linux" {
		if contents, err := os.ReadFile("/etc/os-release"); err == nil {
			for _, line := range strings.Split(string(contents), "\n") {
				if strings.HasPrefix(line, "PRETTY_NAME=") {
					return strings.Trim(strings.TrimPrefix(line, "PRETTY_NAME="), "\"")
				}
			}
		}
	}
	return runtime.GOOS
}
