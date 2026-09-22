package system

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"sync"
	"time"

	"endpoint-agent/api"
	"endpoint-agent/logger"
	"github.com/fsnotify/fsnotify"
)

var supportedFileExtensions = map[string]bool{
	".zip": true,
	".rar": true,
	".exe": true,
	".msi": true,
	".deb": true,
}

const duplicateEventWindow = 300 * time.Millisecond

type PolicyStore struct {
	mutex    sync.RWMutex
	policies map[string]api.FilePolicy
}

func NewPolicyStore() *PolicyStore {
	return &PolicyStore{policies: make(map[string]api.FilePolicy)}
}

func (store *PolicyStore) Replace(policies []api.FilePolicy) {
	store.mutex.Lock()
	defer store.mutex.Unlock()
	store.policies = make(map[string]api.FilePolicy, len(policies))
	for _, policy := range policies {
		store.policies[strings.ToLower(policy.Extension)] = policy
	}
}

func (store *PolicyStore) Match(extension string) *api.FilePolicy {
	store.mutex.RLock()
	defer store.mutex.RUnlock()
	policy, ok := store.policies[strings.ToLower(extension)]
	if !ok {
		return nil
	}
	return &policy
}

func StartFileMonitor(ctx context.Context, client *api.Client, agentID string, policies *PolicyStore) error {
	watcher, err := fsnotify.NewWatcher()
	if err != nil {
		return fmt.Errorf("create file watcher: %w", err)
	}
	defer watcher.Close()

	watchedDirectories := 0
	for _, directory := range monitorDirectories() {
		if _, err := os.Stat(directory); err != nil {
			if !os.IsNotExist(err) {
				logger.Errorf("Unable to inspect file monitor directory %s: %v", directory, err)
			}
			continue
		}
		if err := watcher.Add(directory); err != nil {
			logger.Errorf("Unable to watch file monitor directory %s: %v", directory, err)
			continue
		}
		watchedDirectories++
		logger.Infof("File monitor watching: %s", directory)
	}

	if watchedDirectories == 0 {
		return fmt.Errorf("no file monitor directories are available")
	}

	lastEvents := make(map[string]time.Time)
	var eventsMutex sync.Mutex
	for {
		select {
		case <-ctx.Done():
			return nil
		case event, ok := <-watcher.Events:
			if !ok {
				return nil
			}
			processFileEvent(event, client, agentID, policies, lastEvents, &eventsMutex)
		case watcherError, ok := <-watcher.Errors:
			if ok {
				logger.Errorf("File watcher error: %v", watcherError)
			}
		}
	}
}

func monitorDirectories() []string {
	homeDirectory, err := os.UserHomeDir()
	if err != nil {
		return nil
	}

	directories := []string{
		filepath.Join(homeDirectory, "Downloads"),
		filepath.Join(homeDirectory, "Desktop"),
	}
	if runtime.GOOS == "linux" {
		directories = append(directories, "/tmp")
	}
	return directories
}

func processFileEvent(event fsnotify.Event, client *api.Client, agentID string, policies *PolicyStore, lastEvents map[string]time.Time, eventsMutex *sync.Mutex) {
	extension := strings.ToLower(filepath.Ext(event.Name))
	if !supportedFileExtensions[extension] {
		return
	}

	eventType := watcherEventType(event.Op)
	if eventType == "" {
		return
	}

	now := time.Now()
	eventKey := eventType + "|" + event.Name
	eventsMutex.Lock()
	lastEvent, seenRecently := lastEvents[eventKey]
	if seenRecently && now.Sub(lastEvent) < duplicateEventWindow {
		eventsMutex.Unlock()
		return
	}
	lastEvents[eventKey] = now
	eventsMutex.Unlock()

	fileSize := fileSizeIfAvailable(event.Name, eventType)
	username := Username()
	policy := policies.Match(extension)
	fileEvent := api.FileEvent{
		AgentID:       agentID,
		FileName:      filepath.Base(event.Name),
		FilePath:      event.Name,
		FileExtension: extension,
		EventType:     eventType,
		FileSize:      fileSize,
		Username:      &username,
	}

	if err := client.SendFileEvent(fileEvent); err != nil {
		logger.Errorf("Failed to send file event (%s): %v", eventType, err)
		return
	}
	if policy != nil {
		logger.Infof("Policy matched: %s %s -> %s (%s)", filepath.Base(event.Name), policy.Name, policy.Action, eventType)
	}
	logger.Infof("File event sent: %s %s", eventType, event.Name)
}

func watcherEventType(operation fsnotify.Op) string {
	switch {
	case operation&fsnotify.Remove != 0 || operation&fsnotify.Rename != 0:
		return "deleted"
	case operation&fsnotify.Create != 0:
		return "created"
	case operation&fsnotify.Write != 0:
		return "modified"
	default:
		return ""
	}
}

func fileSizeIfAvailable(path, eventType string) *int64 {
	if eventType == "deleted" {
		return nil
	}
	info, err := os.Stat(path)
	if err != nil || info.IsDir() {
		return nil
	}
	size := info.Size()
	return &size
}
