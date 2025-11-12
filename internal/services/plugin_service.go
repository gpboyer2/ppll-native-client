package services

import (
    "context"
    "log/slog"

    "github.com/wailsapp/wails/v2/pkg/runtime"
    "encoding/json"
)

// PluginMeta 插件元数据
type PluginMeta struct {
    ID          string         `json:"id"`
    Name        string         `json:"name"`
    Version     string         `json:"version"`
    Enable      bool           `json:"enable"`
    Capabilities []string      `json:"capabilities,omitempty"`
    Config      map[string]any `json:"config,omitempty"`
}

// PluginMetaList 插件列表（命名习惯使用 list）
type PluginMetaList struct {
    PluginList []PluginMeta `json:"pluginList"`
}

// PluginService 负责插件启用/禁用状态管理与事件派发
type PluginService struct {
    ctx   context.Context
    log   *slog.Logger
    store *ConfigStore
    list  []PluginMeta
}

// NewPluginService 创建服务实例（内置 3 个占位插件）
func NewPluginService(ctx context.Context, logger *slog.Logger, store *ConfigStore) *PluginService {
    s := &PluginService{ctx: ctx, log: logger, store: store}
    s.list = []PluginMeta{
        {ID: "u-contract-market", Name: "U本位合约超市", Version: "0.1.0", Enable: true},
        {ID: "u-grid-t", Name: "U本位合约做T网格", Version: "0.1.0", Enable: false},
        {ID: "u-grid-tdz", Name: "U本位天地针网格", Version: "0.1.0", Enable: false},
    }
    // 从存储加载（如有）
    if m, err := store.LoadMap(); err == nil {
        if p, ok := m["plugins"]; ok {
            b, _ := json.Marshal(p)
            var ps []PluginMeta
            if err := json.Unmarshal(b, &ps); err == nil && len(ps) > 0 {
                s.list = ps
            }
        }
    }
    return s
}

// List 返回插件列表
func (s *PluginService) List() Response[PluginMetaList] {
    data := PluginMetaList{PluginList: append([]PluginMeta(nil), s.list...)}
    return Ok(&data)
}

// Enable 启用插件
func (s *PluginService) Enable(id string) Response[PluginMeta] {
    for i := range s.list {
        if s.list[i].ID == id {
            s.list[i].Enable = true
            s.persist()
            runtime.EventsEmit(s.ctx, "plugin:enabled", s.list[i])
            return Ok(&s.list[i])
        }
    }
    return Err[PluginMeta](1, "未找到插件")
}

// Disable 禁用插件
func (s *PluginService) Disable(id string) Response[PluginMeta] {
    for i := range s.list {
        if s.list[i].ID == id {
            s.list[i].Enable = false
            s.persist()
            runtime.EventsEmit(s.ctx, "plugin:disabled", s.list[i])
            return Ok(&s.list[i])
        }
    }
    return Err[PluginMeta](1, "未找到插件")
}

// persist 持久化插件列表
func (s *PluginService) persist() {
    m, err := s.store.LoadMap()
    if err != nil {
        s.log.Error("load plugins for save", "err", err)
        return
    }
    m["plugins"] = s.list
    if err := s.store.SaveMap(m); err != nil {
        s.log.Error("save plugins", "err", err)
    }
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
    // 总映射键：pluginConfig -> map[id]cfg
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
    // 取出总映射
    var mm map[string]map[string]any
    if raw, ok := m["pluginConfig"]; ok {
        b, _ := json.Marshal(raw)
        _ = json.Unmarshal(b, &mm)
    }
    if mm == nil { mm = map[string]map[string]any{} }
    mm[id] = cfg
    m["pluginConfig"] = mm
    if err := s.store.SaveMap(m); err != nil {
        s.log.Error("save plugin config", "err", err)
        return Err[any](3, "保存配置失败")
    }
    // 配置更新事件（可用于前端联动）
    runtime.EventsEmit(s.ctx, "plugin:config", map[string]any{"id": id})
    return Ok[any](nil)
}
