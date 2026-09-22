package logger

import (
	"log"
	"os"
)

var standard = log.New(os.Stdout, "[endpoint-agent] ", log.LstdFlags)

func Infof(format string, args ...interface{}) {
	standard.Printf(format, args...)
}

func Errorf(format string, args ...interface{}) {
	standard.Printf("ERROR: "+format, args...)
}
