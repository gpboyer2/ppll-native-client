package services

import (
	"net/http"
	"net/url"
	"os"
	"sync"
	"time"
)

// 全局 HTTP 客户端单例
var (
	globalHTTPClient *http.Client
	httpClientOnce   sync.Once
)

// getProxyURL 从环境变量获取代理配置
// 支持的环境变量（按优先级排序）: HTTPS_PROXY, https_proxy, HTTP_PROXY, http_proxy, ALL_PROXY, all_proxy
func getProxyURL() *url.URL {
	// 按优先级检查环境变量
	proxyEnvVars := []string{"HTTPS_PROXY", "https_proxy", "HTTP_PROXY", "http_proxy", "ALL_PROXY", "all_proxy"}

	for _, envVar := range proxyEnvVars {
		if proxyStr := os.Getenv(envVar); proxyStr != "" {
			if proxyURL, err := url.Parse(proxyStr); err == nil {
				return proxyURL
			}
		}
	}
	return nil
}

// NewHTTPClient 创建支持代理的 HTTP 客户端
// 自动从环境变量读取代理配置
func NewHTTPClient() *http.Client {
	proxyURL := getProxyURL()

	transport := &http.Transport{
		// 设置代理
		Proxy: http.ProxyFromEnvironment,
		// 如果环境变量中有代理配置，强制使用
	}

	// 如果从环境变量获取到了代理URL，强制使用该代理
	if proxyURL != nil {
		transport.Proxy = func(*http.Request) (*url.URL, error) {
			return proxyURL, nil
		}
	}

	return &http.Client{
		Transport: transport,
		Timeout:   30 * time.Second,
	}
}

// GetHTTPClient 获取全局 HTTP 客户端单例
// 使用单例模式确保整个应用使用同一个客户端实例
func GetHTTPClient() *http.Client {
	httpClientOnce.Do(func() {
		globalHTTPClient = NewHTTPClient()
	})
	return globalHTTPClient
}

// ResetHTTPClient 重置全局 HTTP 客户端
// 用于代理配置变更后重新初始化客户端
func ResetHTTPClient() {
	httpClientOnce = sync.Once{}
	globalHTTPClient = nil
}
