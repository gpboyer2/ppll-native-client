package services

import (
    "context"
    "crypto/md5"
    "encoding/hex"
    "encoding/json"
    "errors"
    "fmt"
    "io"
    "log/slog"
    "net/http"
    "os"
    goruntime "runtime"
    "path/filepath"
    "strings"
    "time"

    wruntime "github.com/wailsapp/wails/v2/pkg/runtime"
)

// UpdateConfig 更新配置，支持静默/自动/手动
type UpdateConfig struct {
    FeedURL             string `json:"feedURL"`              // 服务器地址或接口路径
    Channel             string `json:"channel"`              // 渠道：stable/beta 等（内部渠道，不上架第三方）
    AutoCheck           bool   `json:"autoCheck"`            // 是否自动检查
    CheckIntervalMinute int    `json:"checkIntervalMinute"` // 自动检查间隔分钟
    AutoDownload        bool   `json:"autoDownload"`         // 自动下载
    SilentInstall       bool   `json:"silentInstall"`        // 静默安装（下次启动切换）
    HashAlgo            string `json:"hashAlgo"`             // 哈希算法：md5（当前）
}

// UpdateInfo 更新信息
type UpdateInfo struct {
    Available bool   `json:"available"` // 是否有更新
    Version   string `json:"version"`   // 版本号
    URL       string `json:"url"`       // 下载地址
    MD5       string `json:"md5"`       // MD5 校验
    Size      int64  `json:"size"`      // 大小（字节）
    Notes     string `json:"notes"`     // 更新说明
}

// DownloadProgress 下载进度
type DownloadProgress struct {
    Version  string  `json:"version"`
    Received int64   `json:"received"`
    Total    int64   `json:"total"`
    Percent  float64 `json:"percent"`
}

// UpdateService 负责更新流程：检查、下载、校验、事件派发
type UpdateService struct {
    ctx    context.Context
    log    *slog.Logger
    config UpdateConfig
    store  *ConfigStore
}

// NewUpdateService 创建服务实例
func NewUpdateService(ctx context.Context, logger *slog.Logger, store *ConfigStore, cfg UpdateConfig) *UpdateService {
    s := &UpdateService{ctx: ctx, log: logger, config: cfg, store: store}
    // 尝试从存储加载配置（若存在则覆盖）
    if m, err := store.LoadMap(); err == nil {
        if u, ok := m["update"]; ok {
            // 兼容 map -> struct
            b, _ := json.Marshal(u)
            var uc UpdateConfig
            if err := json.Unmarshal(b, &uc); err == nil && uc.FeedURL != "" {
                s.config = uc
            }
        }
    }
    if s.config.CheckIntervalMinute <= 0 {
        s.config.CheckIntervalMinute = 30
    }
    if s.config.HashAlgo == "" {
        s.config.HashAlgo = "md5"
    }
    // 自动检查
    if s.config.AutoCheck {
        go s.loop()
    }
    return s
}

// SaveConfig 保存配置
func (s *UpdateService) SaveConfig(cfg UpdateConfig) Response[any] {
    s.config = cfg
    m, err := s.store.LoadMap()
    if err != nil {
        s.log.Error("load update config", "err", err)
        return Err[any](1, "读取更新配置失败")
    }
    m["update"] = cfg
    if err := s.store.SaveMap(m); err != nil {
        s.log.Error("save update config", "err", err)
        return Err[any](1, "保存更新配置失败")
    }
    return Ok[any](nil)
}

// loop 定时检查更新
func (s *UpdateService) loop() {
    ticker := time.NewTicker(time.Duration(s.config.CheckIntervalMinute) * time.Minute)
    defer ticker.Stop()
    for {
        select {
        case <-s.ctx.Done():
            return
        case <-ticker.C:
            _ = s.CheckNow()
        }
    }
}

// CheckNow 立即检查更新（最小实现：仅访问接口并透传字段）
func (s *UpdateService) CheckNow() Response[UpdateInfo] {
    if s.config.FeedURL == "" {
        return Err[UpdateInfo](2, "未配置更新源")
    }
    // 这里为最小骨架：GET feedURL，期望返回 UpdateInfo 格式 JSON（带重试）
    // 支持以逗号分隔的多个 FeedURL，按顺序尝试
    urls := splitFeedList(s.config.FeedURL)
    var resp *http.Response
    var err error
    var lastErr error
    var info UpdateInfo
    for _, u := range urls {
        resp, err = s.httpGetWithRetry(u, 3)
        if err != nil {
            lastErr = err
            continue
        }
        // 读取全部响应后尝试多种解析以适配不同服务端格式
        body, _ := io.ReadAll(resp.Body)
        resp.Body.Close()
        info, err = s.normalizeFromAny(body)
        if err != nil {
            lastErr = err
            continue
        }
        // 成功解析即退出循环
        break
    }
    if err != nil && info.Version == "" && info.URL == "" && !info.Available {
        s.log.Error("check update", "err", lastErr)
        wruntime.EventsEmit(s.ctx, "update:error", fmt.Sprintf("%v", lastErr))
        return Err[UpdateInfo](3, "检查更新失败")
    }
    if info.Available {
        wruntime.EventsEmit(s.ctx, "update:available", info)
        if s.config.AutoDownload {
            go s.Download(info)
        }
    }
    return Ok(&info)
}

// Download 下载更新（最小实现：请求并汇报进度，不落盘具体安装器）
func (s *UpdateService) Download(info UpdateInfo) Response[any] {
    if !info.Available || info.URL == "" {
        return Err[any](6, "无可用更新")
    }
    // 断点续传骨架：检测分片文件并设置 Range
    partPath, existSize := s.partialPath(info.Version)
    var req *http.Request
    if existSize > 0 {
        req, _ = http.NewRequestWithContext(s.ctx, http.MethodGet, info.URL, nil)
        req.Header.Set("Range", fmt.Sprintf("bytes=%d-", existSize))
    } else {
        req, _ = http.NewRequestWithContext(s.ctx, http.MethodGet, info.URL, nil)
    }
    if err := os.MkdirAll(filepath.Dir(partPath), 0o755); err != nil {
        wruntime.EventsEmit(s.ctx, "update:error", "临时目录创建失败")
        return Err[any](9, "临时目录创建失败")
    }
    resp, err := http.DefaultClient.Do(req)
    if err != nil {
        wruntime.EventsEmit(s.ctx, "update:error", fmt.Sprintf("%v", err))
        return Err[any](7, "下载失败")
    }
    defer resp.Body.Close()
    if resp.StatusCode != 200 && resp.StatusCode != 206 {
        wruntime.EventsEmit(s.ctx, "update:error", fmt.Sprintf("status %d", resp.StatusCode))
        return Err[any](8, "下载响应异常")
    }
    // 打开临时分片文件
    var f *os.File
    if existSize > 0 && resp.StatusCode == 206 {
        f, err = os.OpenFile(partPath, os.O_WRONLY|os.O_APPEND, 0o600)
    } else {
        f, err = os.OpenFile(partPath, os.O_CREATE|os.O_TRUNC|os.O_WRONLY, 0o600)
        existSize = 0
    }
    if err != nil {
        wruntime.EventsEmit(s.ctx, "update:error", "临时文件创建失败")
        return Err[any](9, "临时文件创建失败")
    }
    defer f.Close()

    var received int64
    total := resp.ContentLength
    expected := info.Size
    if expected <= 0 {
        if total > 0 {
            expected = total + existSize
        }
    }
    h := md5.New()
    // 将已存在部分计入口令摘要
    if existSize > 0 {
        if ef, e := os.Open(partPath); e == nil {
            io.CopyN(h, ef, existSize)
            ef.Close()
        }
    }
    buf := make([]byte, 64*1024)
    for {
        n, rerr := resp.Body.Read(buf)
        if n > 0 {
            if _, werr := f.Write(buf[:n]); werr != nil {
                wruntime.EventsEmit(s.ctx, "update:error", "写入临时文件失败")
                return Err[any](10, "写入临时文件失败")
            }
            h.Write(buf[:n])
            received += int64(n)
            base := existSize + received
            denom := expected
            if denom <= 0 { denom = base }
            percent := float64(base) / float64(max64(denom, 1)) * 100
            wruntime.EventsEmit(s.ctx, "update:progress", DownloadProgress{Version: info.Version, Received: received, Total: total, Percent: percent})
        }
        if rerr != nil {
            if errors.Is(rerr, context.Canceled) {
                return Err[any](11, "下载已取消")
            }
            if !errors.Is(rerr, context.DeadlineExceeded) && rerr.Error() != "EOF" {
                break
            }
            break
        }
    }
    // 校验 MD5（如有）
    if info.MD5 != "" {
        sum := hex.EncodeToString(h.Sum(nil))
        if !equalMD5(sum, info.MD5) {
            wruntime.EventsEmit(s.ctx, "update:error", "MD5 校验失败")
            return Err[any](12, "MD5 校验失败")
        }
    }
    // 标记“已下载”，根据策略派发事件
    wruntime.EventsEmit(s.ctx, "update:downloaded", map[string]any{"version": info.Version, "path": partPath})
    if s.config.SilentInstall {
        wruntime.EventsEmit(s.ctx, "app:restart-required", map[string]any{"version": info.Version})
    } else {
        // 通知前端可提示“立即重启安装/稍后”
        wruntime.EventsEmit(s.ctx, "notify:push", Notification{ID: fmt.Sprintf("update-%s", info.Version), Level: "info", Title: "下载完成", Content: "新版本已下载，重启后生效", Ts: time.Now().Unix()})
    }
    return Ok[any](nil)
}

// ApplyOnNextStart 仅记录意图，实际安装在下次启动由外部安装器处理
func (s *UpdateService) ApplyOnNextStart() Response[any] {
    wruntime.EventsEmit(s.ctx, "app:restart-required", map[string]any{"version": ""})
    return Ok[any](nil)
}

// 工具函数区

// 为避免在多文件引入 net/http/json，提供一个极小包装，减少 import 冗余
type jsonDecoder interface{ Decode(v any) error }

func jsonNewDecoder(r any) jsonDecoder { return &stdJSONDecoder{r: r.(interface{ Read([]byte) (int, error) })} }

type stdJSONDecoder struct{ r interface{ Read([]byte) (int, error) } }

func (d *stdJSONDecoder) Decode(v any) error {
    // 简化：将全部读入内存后再 Unmarshal，足够满足更新检查接口（小体积 JSON）
    buf := make([]byte, 0, 4096)
    tmp := make([]byte, 2048)
    for {
        n, err := d.r.Read(tmp)
        if n > 0 {
            buf = append(buf, tmp[:n]...)
        }
        if err != nil {
            break
        }
    }
    return jsonUnmarshal(buf, v)
}

func jsonUnmarshal(b []byte, v any) error {
    type u = any
    return jsonUnmarshalStd(b, v.(u))
}

// 使用标准库 json，但避免在顶部 import 再引入，以便本文件聚焦逻辑
var jsonUnmarshalStd = func(b []byte, v any) error {
    return jsonUnmarshalImpl(b, v)
}

// 由同文件提供实际实现，便于上面局部替换
func jsonUnmarshalImpl(b []byte, v any) error {
    // 引入标准库 json（局部作用域）
    type jsonPkg = struct{}
    _ = jsonPkg{}
    return jsonUnmarshalNative(b, v)
}

// 使用原生 json 包实现解码（避免在顶部 import 造成视觉干扰）
func jsonUnmarshalNative(b []byte, v any) error {
    return json.Unmarshal(b, v)
}

// tempFile 创建临时文件
func tempFile() (*os.File, string, error) {
    f, err := os.CreateTemp("", "ppll-client-update-*")
    if err != nil {
        return nil, "", err
    }
    return f, f.Name(), nil
}

func max64(a, b int64) int64 { if a > b { return a }; return b }

func equalMD5(a, b string) bool { return strings.EqualFold(strings.TrimSpace(a), strings.TrimSpace(b)) }

// httpGetWithRetry 带指数退避的 GET 请求
func (s *UpdateService) httpGetWithRetry(url string, tries int) (*http.Response, error) {
    var last error
    backoff := 500 * time.Millisecond
    for i := 0; i < tries; i++ {
        req, _ := http.NewRequestWithContext(s.ctx, http.MethodGet, url, nil)
        resp, err := http.DefaultClient.Do(req)
        if err == nil && resp != nil && resp.StatusCode == 200 {
            return resp, nil
        }
        if err == nil && resp != nil && resp.Body != nil {
            resp.Body.Close()
        }
        if err != nil {
            last = err
        } else {
            last = fmt.Errorf("status %d", resp.StatusCode)
        }
        time.Sleep(backoff)
        backoff *= 2
    }
    return nil, last
}

// partialPath 返回分片文件路径与已存在大小
func (s *UpdateService) partialPath(version string) (string, int64) {
    dir := filepath.Join(os.TempDir(), "ppll-client-update")
    path := filepath.Join(dir, fmt.Sprintf("%s.part", strings.ReplaceAll(version, "/", "_")))
    if st, err := os.Stat(path); err == nil && !st.IsDir() {
        return path, st.Size()
    }
    return path, 0
}

// normalizeFromAny 支持以下情况：
// 1) 直接是 UpdateInfo
// 2) 平铺 map；或嵌套在 data/result/release 下
// 3) 数组（多 release），按平台/文件后缀/第一项择优
func (s *UpdateService) normalizeFromAny(body []byte) (UpdateInfo, error) {
    var info UpdateInfo
    // 尝试直接结构
    if err := json.Unmarshal(body, &info); err == nil && (info.URL != "" || info.Available) {
        return info, nil
    }
    // 尝试 map 平铺或嵌套
    var m map[string]any
    if err := json.Unmarshal(body, &m); err == nil {
        // 如果存在 data/result/release 等，则下钻
        for _, k := range []string{"data", "result", "release"} {
            if v, ok := m[k]; ok {
                if mm, ok2 := v.(map[string]any); ok2 {
                    m = mm
                    break
                }
            }
        }
        return s.normalizeUpdateInfo(m), nil
    }
    // 尝试数组
    var arr []map[string]any
    if err := json.Unmarshal(body, &arr); err == nil && len(arr) > 0 {
        idx := pickByPlatform(arr)
        return s.normalizeUpdateInfo(arr[idx]), nil
    }
    return UpdateInfo{}, errors.New("unsupported feed format")
}

// splitFeedList 逗号/分号/空白分隔的多 URL
func splitFeedList(surls string) []string {
    f := strings.FieldsFunc(surls, func(r rune) bool { return r == ',' || r == ';' || r == ' ' || r == '\n' || r == '\t' })
    out := make([]string, 0, len(f))
    for _, u := range f {
        u = strings.TrimSpace(u)
        if u != "" {
            out = append(out, u)
        }
    }
    if len(out) == 0 && strings.TrimSpace(surls) != "" {
        out = []string{strings.TrimSpace(surls)}
    }
    return out
}

// pickByPlatform 按 OS/ARCH 或文件后缀选择最合适的条目
func pickByPlatform(arr []map[string]any) int {
    os := goruntime.GOOS
    arch := goruntime.GOARCH
    // 优先匹配 platform/os 字段
    for i, it := range arr {
        p := strings.ToLower(strFrom(it["platform"]))
        o := strings.ToLower(strFrom(it["os"]))
        a := strings.ToLower(strFrom(it["arch"]))
        if (p != "" && strings.Contains(p, os)) || (o != "" && strings.Contains(o, os)) {
            if a == "" || strings.Contains(a, arch) {
                return i
            }
        }
    }
    // 再按 URL 后缀匹配
    for i, it := range arr {
        u := strings.ToLower(strFrom(it["url"]))
        switch os {
        case "darwin":
            if strings.HasSuffix(u, ".dmg") || strings.HasSuffix(u, ".pkg") { return i }
        case "windows":
            if strings.HasSuffix(u, ".exe") || strings.HasSuffix(u, ".msi") { return i }
        default:
            if strings.HasSuffix(u, ".appimage") || strings.HasSuffix(u, ".tar.gz") || strings.HasSuffix(u, ".deb") || strings.HasSuffix(u, ".rpm") { return i }
        }
    }
    // 否则返回第一项
    return 0
}

// normalizeUpdateInfo 将多种字段格式适配成 UpdateInfo
func (s *UpdateService) normalizeUpdateInfo(m map[string]any) UpdateInfo {
    // available / hasUpdate / needUpdate / code==0 and version>
    av := boolFrom(m["available"]) || boolFrom(m["hasUpdate"]) || boolFrom(m["needUpdate"]) || intFrom(m["available"]) == 1 || intFrom(m["hasUpdate"]) == 1
    ver := strFrom(m["version"]) 
    if ver == "" {
        ver = strFrom(m["ver"]) 
    }
    if ver == "" {
        ver = strFrom(m["versionName"]) 
    }
    url := strFrom(m["url"]) 
    if url == "" { url = strFrom(m["download"]) }
    if url == "" { url = strFrom(m["pkg"]) }
    if url == "" { url = strFrom(m["link"]) }
    md5v := strFrom(m["md5"]) 
    if md5v == "" { md5v = strFrom(m["checksum"]) }
    if md5v == "" { md5v = strFrom(m["hash"]) }
    size := int64From(m["size"]) 
    if size == 0 { size = int64From(m["bytes"]) }
    if size == 0 { size = int64From(m["filesize"]) }
    notes := strFrom(m["notes"]) 
    if notes == "" { notes = strFrom(m["changelog"]) }
    if notes == "" { notes = strFrom(m["desc"]) }
    return UpdateInfo{Available: av, Version: ver, URL: url, MD5: md5v, Size: size, Notes: notes}
}

func strFrom(v any) string {
    switch t := v.(type) {
    case string:
        return strings.TrimSpace(t)
    case fmt.Stringer:
        return strings.TrimSpace(t.String())
    case float64:
        return fmt.Sprintf("%v", t)
    case int, int64, int32, uint64, uint:
        return fmt.Sprintf("%v", t)
    case bool:
        if t { return "true" }
        return "false"
    default:
        return ""
    }
}

func boolFrom(v any) bool {
    switch t := v.(type) {
    case bool:
        return t
    case string:
        s := strings.ToLower(strings.TrimSpace(t))
        return s == "1" || s == "true" || s == "yes" || s == "y"
    case float64:
        return int(t) == 1
    case int:
        return t == 1
    default:
        return false
    }
}

func intFrom(v any) int {
    switch t := v.(type) {
    case int:
        return t
    case float64:
        return int(t)
    case string:
        var i int
        fmt.Sscanf(strings.TrimSpace(t), "%d", &i)
        return i
    default:
        return 0
    }
}

func int64From(v any) int64 {
    switch t := v.(type) {
    case int64:
        return t
    case int:
        return int64(t)
    case float64:
        return int64(t)
    case string:
        var i int64
        fmt.Sscanf(strings.TrimSpace(t), "%d", &i)
        return i
    default:
        return 0
    }
}
