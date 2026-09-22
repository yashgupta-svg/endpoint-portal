# Endpoint Agent

A small Go console agent for the Endpoint Portal backend.

## Requirements

- Go 1.21 or newer
- Endpoint Portal backend running at `http://localhost:3000`

## Build and run

From this directory:

```powershell
go mod tidy
go build -o endpoint-agent.exe .
$env:API_URL="http://localhost:3000"
.\endpoint-agent.exe
```

On Linux:

```bash
go mod tidy
go build -o endpoint-agent .
export API_URL="http://localhost:3000"
./endpoint-agent
```

The default backend URL is `http://localhost:3000`. The agent ID is stored in `agent-id` beside the executable's working directory and is reused after restarts. Set `AGENT_ID_FILE` to choose another path.

The agent registers once at startup and submits metrics immediately, then every 10 seconds. Set `METRICS_INTERVAL_SECONDS` to change the interval during development.

`network_download` and `network_upload` are measured in MB/s (mebibytes per second, calculated from interface byte counters). The first network sample reports zero because a previous sample is required to calculate a rate.

The agent also watches the user's `Downloads` and `Desktop` directories on Windows. On Linux it additionally watches `/tmp`. It reports only `.zip`, `.rar`, `.exe`, `.msi`, and `.deb` file creation, modification, and deletion events to `POST /api/file-events`. File event failures are logged and do not stop metric collection.

Temporary HTTP or network failures are logged and retried on the next tick. The agent remains a normal console application; it does not install a service or auto-start mechanism.
