package services

// 统一响应结构，所有服务方法必须返回相同结构
// Code: 0 表示成功，非 0 表示失败；Msg 提示信息；Data 为结果数据；TraceID 便于链路追踪
// 注意：不要返回空字符串，空值请返回 nil 或明确的空结构
type Response[T any] struct {
    Code    int     `json:"code"`
    Msg     string  `json:"msg"`
    Data    *T      `json:"data,omitempty"`
    TraceID string  `json:"traceID,omitempty"`
}

// Ok 构造成功响应
func Ok[T any](data *T) Response[T] {
    return Response[T]{
        Code: 0,
        Msg:  "OK",
        Data: data,
    }
}

// Err 构造错误响应
func Err[T any](code int, msg string) Response[T] {
    return Response[T]{
        Code: code,
        Msg:  msg,
        Data: nil,
    }
}

