package services

import (
	"context"
	"crypto/aes"
	"crypto/cipher"
	"crypto/md5"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io/fs"
	"os"
	"path/filepath"
	"strings"
)

// ConfigStore 使用 AES 加密保存配置到应用数据目录
// 说明：
// - 为满足“文件存储 + AES 加密”的要求，这里使用 AES-256-GCM。
// - 生产环境建议通过环境变量 PPLL_AES_KEY 提供 32 字节密钥（base16/base64），避免硬编码。
// - 若未提供，将基于应用名+机器信息派生弱密钥，仅用于开发调试，不建议用于生产。
type ConfigStore struct {
	ctx    context.Context
	app    string
	aesKey []byte
}

// NewConfigStore 创建存储实例
func NewConfigStore(ctx context.Context, appName string, aesKey []byte) *ConfigStore {
	key := aesKey
	if len(key) == 0 {
		// 派生一个弱密钥：AppName + User + Host 的 MD5（仅开发使用）
		u, _ := os.UserHomeDir()
		h, _ := os.Hostname()
		sum := md5.Sum([]byte(appName + "|" + u + "|" + h))
		// 32 字节：md5 * 2
		key = append(sum[:], sum[:]...)
	}
	if len(key) < 32 {
		// 不足则右填充到 32
		pad := make([]byte, 32-len(key))
		key = append(key, pad...)
	}
	if len(key) > 32 {
		key = key[:32]
	}
	return &ConfigStore{ctx: ctx, app: appName, aesKey: key}
}

// path 返回配置文件路径
func (s *ConfigStore) path() (string, error) {
	// 使用标准库用户配置目录，避免对运行时依赖导致的编译问题
	dir, err := os.UserConfigDir()
	if err != nil || dir == "" {
		// 回退到用户主目录下的 .config
		home, _ := os.UserHomeDir()
		if home == "" {
			return "", errors.New("appdata dir empty")
		}
		dir = filepath.Join(home, ".config")
	}
	p := filepath.Join(dir, s.app)
	if err := os.MkdirAll(p, 0o755); err != nil {
		return "", err
	}
	return filepath.Join(p, "config.enc.json"), nil
}

// Save 保存任意对象为 JSON 并加密
func (s *ConfigStore) Save(v any) error {
	p, err := s.path()
	if err != nil {
		return err
	}
	raw, err := json.Marshal(v)
	if err != nil {
		return err
	}
	enc, err := s.encrypt(raw)
	if err != nil {
		return err
	}
	return os.WriteFile(p, enc, 0o600)
}

// Load 读取并解密 JSON 到对象
func (s *ConfigStore) Load(v any) error {
	p, err := s.path()
	if err != nil {
		return err
	}
	b, err := os.ReadFile(p)
	if err != nil {
		if errors.Is(err, fs.ErrNotExist) {
			return nil // 不存在视为默认配置
		}
		return err
	}
	raw, err := s.decrypt(b)
	if err != nil {
		return err
	}
	return json.Unmarshal(raw, v)
}

// LoadMap 读取为 map 便于合并不同模块配置
func (s *ConfigStore) LoadMap() (map[string]any, error) {
	var m map[string]any
	if err := s.Load(&m); err != nil {
		// 文件不存在时返回空 map
		if errors.Is(err, fs.ErrNotExist) {
			return map[string]any{}, nil
		}
		if err.Error() == "appdata dir empty" {
			return map[string]any{}, nil
		}
		// 其他错误直接返回
		return nil, err
	}
	if m == nil {
		m = map[string]any{}
	}
	return m, nil
}

// SaveMap 将 map 序列化保存（整体替换），调用前请先 LoadMap 合并后再保存
func (s *ConfigStore) SaveMap(m map[string]any) error {
	return s.Save(m)
}

// encrypt 使用 AES-256-GCM 加密并以 hex 编码存储
func (s *ConfigStore) encrypt(plain []byte) ([]byte, error) {
	block, err := aes.NewCipher(s.aesKey)
	if err != nil {
		return nil, err
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, err
	}
	// 使用安全随机 nonce，并与密文一同前缀存储
	nonce := make([]byte, gcm.NonceSize())
	if _, err := rand.Read(nonce); err != nil {
		return nil, err
	}
	out := gcm.Seal(nil, nonce, plain, nil)
	buf := make([]byte, 0, len(nonce)+len(out))
	buf = append(buf, nonce...)
	buf = append(buf, out...)
	dst := make([]byte, hex.EncodedLen(len(buf)))
	hex.Encode(dst, buf)
	return dst, nil
}

// decrypt 解密 hex 编码的密文
func (s *ConfigStore) decrypt(enc []byte) ([]byte, error) {
	rawHex := strings.TrimSpace(string(enc))
	buf, err := hex.DecodeString(rawHex)
	if err != nil {
		return nil, fmt.Errorf("hex decode: %w", err)
	}
	block, err := aes.NewCipher(s.aesKey)
	if err != nil {
		return nil, err
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, err
	}
	ns := gcm.NonceSize()
	if len(buf) < ns {
		return nil, errors.New("ciphertext too short")
	}
	nonce := buf[:ns]
	data := buf[ns:]
	out, err := gcm.Open(nil, nonce, data, nil)
	if err != nil {
		return nil, err
	}
	return out, nil
}
