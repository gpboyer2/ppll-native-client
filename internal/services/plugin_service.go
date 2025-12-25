package services

import (
    "context"
    "encoding/json"
    "log/slog"

    "github.com/wailsapp/wails/v2/pkg/runtime"
)

// PluginService 负责插件运行时配置的加密持久化存储
// 插件元数据和启用状态由前端管理，后端仅存储敏感配置（如API密钥）
type PluginService struct {
    ctx   context.Context
    log   *slog.Logger
    store *ConfigStore
}

// NewPluginService 创建服务实例
func NewPluginService(ctx context.Context, logger *slog.Logger, store *ConfigStore) *PluginService {
    return &PluginService{ctx: ctx, log: logger, store: store}
}

// GetConfig 读取指定插件的配置（加密持久化存储）
func (s *PluginService) GetConfig(id string) Response[map[string]any] {
    if id == "" {
        return Err[map[string]any](1, "无效插件ID")
    }
    m, err := s.store.LoadMap()
    if err != nil {
        s.log.Error("load plugin config", "err", err)
        return Err[map[string]any](2, "读取配置失败")
    }
    raw, ok := m["pluginConfig"]
    if !ok {
        empty := map[string]any{}
        return Ok(&empty)
    }
    b, _ := json.Marshal(raw)
    var mm map[string]map[string]any
    _ = json.Unmarshal(b, &mm)
    cfg := mm[id]
    if cfg == nil {
        cfg = map[string]any{}
    }
    return Ok(&cfg)
}

// SaveConfig 保存指定插件的配置
func (s *PluginService) SaveConfig(id string, cfg map[string]any) Response[any] {
    if id == "" {
        return Err[any](1, "无效插件ID")
    }
    m, err := s.store.LoadMap()
    if err != nil {
        s.log.Error("load plugin config", "err", err)
        return Err[any](2, "读取配置失败")
    }
    var mm map[string]map[string]any
    if raw, ok := m["pluginConfig"]; ok {
        b, _ := json.Marshal(raw)
        _ = json.Unmarshal(b, &mm)
    }
    if mm == nil {
        mm = map[string]map[string]any{}
    }
    mm[id] = cfg
    m["pluginConfig"] = mm
    if err := s.store.SaveMap(m); err != nil {
        s.log.Error("save plugin config", "err", err)
        return Err[any](3, "保存配置失败")
    }
    runtime.EventsEmit(s.ctx, "plugin:config", map[string]any{"id": id})
    return Ok[any](nil)
}
