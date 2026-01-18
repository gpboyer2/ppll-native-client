package services

// 统一响应结构，所有服务方法必须返回相同结构
// Status: success/error 状态；Message 提示信息；Data 为结果数据
// 注意：不要返回空字符串，空值请返回 nil 或明确的空结构
type Response[T any] struct {
	Status  string `json:"status"`
	Message string `json:"message"`
	Data    *T     `json:"data,omitempty"`
}

// Ok 构造成功响应
func Ok[T any](data *T) Response[T] {
	return Response[T]{
		Status:  "success",
		Message: "操作成功",
		Data:    data,
	}
}

// Err 构造错误响应
func Err[T any](message string) Response[T] {
	return Response[T]{
		Status:  "error",
		Message: message,
		Data:    nil,
	}
}
