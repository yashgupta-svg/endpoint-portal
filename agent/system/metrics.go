package system

import (
	"bufio"
	"fmt"
	"os"
	"os/exec"
	"runtime"
	"strconv"
	"strings"
	"time"
)

type Metrics struct {
	CPUUsage        float64
	RAMUsage        float64
	DiskUsage       float64
	NetworkDownload float64
	NetworkUpload   float64
}

type networkSample struct {
	downBytes uint64
	upBytes   uint64
	at        time.Time
}

var previousNetwork networkSample

func CollectMetrics() (Metrics, error) {
	cpu, err := cpuUsage()
	if err != nil {
		return Metrics{}, err
	}

	ram, err := ramUsage()
	if err != nil {
		return Metrics{}, err
	}

	disk, err := diskUsage()
	if err != nil {
		return Metrics{}, err
	}

	down, up, err := networkUsage()
	if err != nil {
		return Metrics{}, err
	}

	return Metrics{
		CPUUsage:        clampPercentage(cpu),
		RAMUsage:        clampPercentage(ram),
		DiskUsage:       clampPercentage(disk),
		NetworkDownload: maxZero(down),
		NetworkUpload:   maxZero(up),
	}, nil
}

func cpuUsage() (float64, error) {
	if runtime.GOOS == "linux" {
		first, err := linuxCPUStat()
		if err != nil {
			return 0, err
		}

		time.Sleep(200 * time.Millisecond)

		second, err := linuxCPUStat()
		if err != nil {
			return 0, err
		}

		totalDelta := second.total - first.total
		idleDelta := second.idle - first.idle

		if totalDelta == 0 {
			return 0, nil
		}

		return float64(totalDelta-idleDelta) / float64(totalDelta) * 100, nil
	}

	if runtime.GOOS == "windows" {
		return powershellFloat(`(Get-CimInstance Win32_Processor | Measure-Object -Property LoadPercentage -Average).Average`)
	}

	return 0, nil
}

type cpuStat struct {
	total uint64
	idle  uint64
}

func linuxCPUStat() (cpuStat, error) {
	file, err := os.Open("/proc/stat")
	if err != nil {
		return cpuStat{}, fmt.Errorf("read CPU stats: %w", err)
	}
	defer file.Close()

	scanner := bufio.NewScanner(file)

	if !scanner.Scan() {
		return cpuStat{}, fmt.Errorf("CPU stats are unavailable")
	}

	fields := strings.Fields(scanner.Text())

	if len(fields) < 5 || fields[0] != "cpu" {
		return cpuStat{}, fmt.Errorf("invalid CPU stats")
	}

	var values []uint64

	for _, field := range fields[1:] {
		value, err := strconv.ParseUint(field, 10, 64)
		if err != nil {
			return cpuStat{}, fmt.Errorf("parse CPU stats: %w", err)
		}

		values = append(values, value)
	}

	var total uint64

	for _, value := range values {
		total += value
	}

	return cpuStat{
		total: total,
		idle:  values[3],
	}, nil
}

func ramUsage() (float64, error) {
	if runtime.GOOS == "linux" {
		file, err := os.Open("/proc/meminfo")
		if err != nil {
			return 0, fmt.Errorf("read memory stats: %w", err)
		}
		defer file.Close()

		var total, available uint64

		scanner := bufio.NewScanner(file)

		for scanner.Scan() {
			fields := strings.Fields(scanner.Text())

			if len(fields) < 2 {
				continue
			}

			value, err := strconv.ParseUint(fields[1], 10, 64)
			if err != nil {
				continue
			}

			switch fields[0] {
			case "MemTotal:":
				total = value
			case "MemAvailable:":
				available = value
			}
		}

		if total == 0 {
			return 0, fmt.Errorf("memory total is unavailable")
		}

		return float64(total-available) / float64(total) * 100, nil
	}

	if runtime.GOOS == "windows" {
		return powershellFloat(`$os = Get-CimInstance Win32_OperatingSystem; 100 * (1 - ($os.FreePhysicalMemory / $os.TotalVisibleMemorySize))`)
	}

	return 0, nil
}

func diskUsage() (float64, error) {
	if runtime.GOOS == "linux" {
		output, err := exec.Command("df", "-P", "/").Output()
		if err != nil {
			return 0, fmt.Errorf("read disk stats: %w", err)
		}

		lines := strings.Split(strings.TrimSpace(string(output)), "\n")

		if len(lines) < 2 {
			return 0, fmt.Errorf("disk stats are unavailable")
		}

		fields := strings.Fields(lines[len(lines)-1])

		if len(fields) < 5 {
			return 0, fmt.Errorf("invalid disk stats")
		}

		value := strings.TrimSuffix(fields[4], "%")

		return strconv.ParseFloat(value, 64)
	}

	if runtime.GOOS == "windows" {
		return powershellFloat(`$disk = Get-CimInstance Win32_LogicalDisk -Filter "DeviceID='C:'"; if (-not $disk -or $disk.Size -eq 0) { throw "C: disk statistics are unavailable" }; 100 * (1 - ($disk.FreeSpace / $disk.Size))`)
	}

	return 0, nil
}

func networkUsage() (float64, float64, error) {
	var downBytes, upBytes uint64
	var err error

	if runtime.GOOS == "linux" {
		downBytes, upBytes, err = linuxNetworkBytes()
	} else if runtime.GOOS == "windows" {
		downBytes, upBytes, err = windowsNetworkBytes()
	} else {
		return 0, 0, nil
	}

	if err != nil {
		return 0, 0, err
	}

	now := time.Now()

	if previousNetwork.at.IsZero() {
		previousNetwork = networkSample{
			downBytes: downBytes,
			upBytes:   upBytes,
			at:        now,
		}

		return 0, 0, nil
	}

	seconds := now.Sub(previousNetwork.at).Seconds()

	if seconds <= 0 {
		return 0, 0, nil
	}

	downRate := float64(delta(downBytes, previousNetwork.downBytes)) / seconds / 1024 / 1024
	upRate := float64(delta(upBytes, previousNetwork.upBytes)) / seconds / 1024 / 1024

	previousNetwork = networkSample{
		downBytes: downBytes,
		upBytes:   upBytes,
		at:        now,
	}

	return downRate, upRate, nil
}

func linuxNetworkBytes() (uint64, uint64, error) {
	file, err := os.Open("/proc/net/dev")
	if err != nil {
		return 0, 0, fmt.Errorf("read network stats: %w", err)
	}
	defer file.Close()

	var down, up uint64

	scanner := bufio.NewScanner(file)

	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())

		if !strings.Contains(line, ":") {
			continue
		}

		parts := strings.SplitN(line, ":", 2)

		if strings.TrimSpace(parts[0]) == "lo" {
			continue
		}

		fields := strings.Fields(parts[1])

		if len(fields) < 9 {
			continue
		}

		received, receiveErr := strconv.ParseUint(fields[0], 10, 64)
		sent, sendErr := strconv.ParseUint(fields[8], 10, 64)

		if receiveErr == nil && sendErr == nil {
			down += received
			up += sent
		}
	}

	return down, up, nil
}

func windowsNetworkBytes() (uint64, uint64, error) {
	received, err := powershellFloat(`(Get-NetAdapterStatistics | Measure-Object -Property ReceivedBytes -Sum).Sum`)
	if err != nil {
		return 0, 0, fmt.Errorf("read Windows received bytes: %w", err)
	}

	sent, err := powershellFloat(`(Get-NetAdapterStatistics | Measure-Object -Property SentBytes -Sum).Sum`)
	if err != nil {
		return 0, 0, fmt.Errorf("read Windows sent bytes: %w", err)
	}

	return uint64(maxZero(received)), uint64(maxZero(sent)), nil
}

func powershellFloat(script string) (float64, error) {
	command := "& { " + script + " } | ForEach-Object { [Console]::Write(([double]$_).ToString([Globalization.CultureInfo]::InvariantCulture)) }"

	output, err := exec.Command(
		"powershell",
		"-NoProfile",
		"-NonInteractive",
		"-Command",
		command,
	).CombinedOutput()

	if err != nil {
		return 0, fmt.Errorf(
			"PowerShell query failed: %w: %s",
			err,
			strings.TrimSpace(string(output)),
		)
	}

	value, err := strconv.ParseFloat(
		strings.TrimSpace(string(output)),
		64,
	)

	if err != nil {
		return 0, fmt.Errorf(
			"parse PowerShell value: %w",
			err,
		)
	}

	return value, nil
}

func delta(current, previous uint64) uint64 {
	if current < previous {
		return 0
	}

	return current - previous
}

func clampPercentage(value float64) float64 {
	if value < 0 {
		return 0
	}

	if value > 100 {
		return 100
	}

	return value
}

func maxZero(value float64) float64 {
	if value < 0 {
		return 0
	}

	return value
}
