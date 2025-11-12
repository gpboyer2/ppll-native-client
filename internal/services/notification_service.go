package services

import (
    "context"
    "log/slog"
    "time"

    "github.com/wailsapp/wails/v2/pkg/runtime"
)

// Notification 应用内通知结构
type Notification struct {
    ID      string `json:"id"`
    Level   string `json:"level"`   // info|warn|error|success
    Title   string `json:"title"`
    Content string `json:"content"`
    Ts      int64  `json:"ts"`      // 秒级时间戳
    TTL     int64  `json:"ttlSeconds,omitempty"`
}

// NotificationService 统一通知派发
type NotificationService struct {
    ctx context.Context
    log *slog.Logger
}

func NewNotificationService(ctx context.Context, logger *slog.Logger) *NotificationService {
    return &NotificationService{ctx: ctx, log: logger}
}

// Push 发送通知（统一响应结构）
func (s *NotificationService) Push(n Notification) Response[Notification] {
    if n.Ts == 0 {
        n.Ts = time.Now().Unix()
    }
    runtime.EventsEmit(s.ctx, "notify:push", n)
    return Ok(&n)
}

// Dismiss 撤销通知
func (s *NotificationService) Dismiss(id string) Response[any] {
    if id == "" {
        return Err[any](1, "无效的通知ID")
    }
    runtime.EventsEmit(s.ctx, "notify:dismiss", map[string]string{"id": id})
    return Ok[any](nil)
}

