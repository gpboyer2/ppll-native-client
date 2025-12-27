/**
 * Swagger API文档配置
 * 配置Swagger UI和API文档生成，提供交互式API文档界面
 */
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const helmet = require('helmet');

const optionsV1 = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'PPLL Native Client API',
            description: 'PPLL量化交易系统 API - 提供网格策略、订单管理、账户管理等核心功能',
            version: '1.0.0',
        },
    },
    // looks for configuration in specified directories
    apis: ['./route/v1/*.js', './controller/*.js', './middleware/*.js'],
}

const swaggerSpecV1 = swaggerJsdoc(optionsV1)

// 根据模块过滤API文档
function filterSwaggerByModule(swaggerSpec, module) {
    if (!module) {
        return swaggerSpec; // 没有模块参数时返回完整文档
    }

    const filteredSpec = JSON.parse(JSON.stringify(swaggerSpec)); // 深拷贝
    const filteredPaths = {};

    // 过滤路径，只保留属于指定模块的路径
    for (const [path, methods] of Object.entries(swaggerSpec.paths || {})) {
        // 匹配 /api/v1/module 或 /api/v1/module/ 开头的路径
        const modulePattern = new RegExp(`^/api/v1/${module}(/|$)`);
        if (modulePattern.test(path)) {
            filteredPaths[path] = methods;
        }
    }

    filteredSpec.paths = filteredPaths;
    filteredSpec.info.title = `${module.toUpperCase()} API DOCS`;
    filteredSpec.info.description = `${module} 模块 API 文档`;

    return filteredSpec;
}

function swaggerDocs(app, port) {
    console.log(`:::::::::::::::: SWAGGER RUNNING ON http://localhost:${port}/api/v1/docs`)
    console.log(`:::::::::::::::: 模块过滤示例: http://localhost:${port}/api/v1/docs?module=user`)
    console.log(`:::::::::::::::: 完整文档(JSON): http://localhost:${port}/api/v1/docs-json?module=user`)

    // Swagger Page For API V1
    app.use('/api/v1/docs', swaggerUi.serve, (req, res, next) => {
        const module = req.query.module;
        const filteredSpec = filterSwaggerByModule(swaggerSpecV1, module);

        return swaggerUi.setup(filteredSpec, {
            explorer: true,
            customCss: '.swagger-ui .topbar { display: none }',
            swaggerOptions: {
                // 移除可能导致问题的自定义URL配置，让Swagger UI使用默认行为
                // requestInterceptor: function (request) {
                //     request.headers.Origin = `http://localhost:${port}`;
                //     return request;
                // },
                responseInterceptor: function (response) {
                    console.log('Response interceptor:', response);

                    // 确保响应对象不为null且有正确的结构
                    if (!response || typeof response !== 'object') {
                        console.error('Invalid response object:', response);
                        return {
                            ok: false,
                            status: 500,
                            statusText: 'Internal Server Error',
                            headers: new Map(),
                            body: JSON.stringify({ error: 'Invalid response' }),
                            url: response ? response.url : '',
                            get: function (key) {
                                return this.headers.get ? this.headers.get(key) : null;
                            }
                        };
                    }

                    // 确保response有get方法
                    if (!response.get && response.headers) {
                        response.get = function (key) {
                            if (this.headers && this.headers.get) {
                                return this.headers.get(key);
                            }
                            if (this.headers && typeof this.headers === 'object') {
                                return this.headers[key] || null;
                            }
                            return null;
                        };
                    }

                    return response;
                }
                // 移除自定义URL配置，让Swagger UI自动处理
                // url: `http://localhost:${port}/api/v1/docs-json${module ? `?module=${module}` : ''}`
            }
        })(req, res, next);
    })

    // Documentation in JSON format
    app.get('/api/v1/docs-json', (req, res) => {
        const module = req.query.module;
        const filteredSpec = filterSwaggerByModule(swaggerSpecV1, module);

        res.setHeader('Content-Type', 'application/json')
        res.send(filteredSpec)
    })

}

module.exports = swaggerDocs