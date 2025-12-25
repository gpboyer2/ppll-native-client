require("dotenv").config({ path: ".env.development" });

const express = require("express");
const cors = require("cors");

const app = express();

// 修改后的 CORS 配置
const corsOptions = {
    origin: function (origin, callback) {
        if (process.env.NODE_ENV === 'development') {
            if (!origin) {
                return callback(null, true);
            }
            if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
                return callback(null, true);
            }
            return callback(null, true);
        }
        const whitelist = ["http://156.245.200.31"];
        if (whitelist.includes(origin)) {
            return callback(null, true);
        }
        callback(new Error('CORS 不允许的来源'));
    }
};

app.use(cors(corsOptions));
app.use(express.json());

const passport = require("passport");
const { jwtStrategy } = require("./config/passport");
app.use(passport.initialize());
passport.use("jwt", jwtStrategy);

const gitInfoMiddleware = require("./middleware/git-info");
app.use(gitInfoMiddleware());

const routeManager = require("./route/route.manager");
routeManager(app);

// error handler
app.use(function (err, req, res, next) {
    console.error('===== API ERROR =====');
    console.error('URL:', req.originalUrl);
    console.error('Method:', req.method);
    console.error('Stack:', err.stack);
    res.status(500).json({ status: 'error', code: 500, message: err.message });
});

const port = 7005;
app.listen(port, () => {
    console.log(`Test server running on http://localhost:${port}`);
    console.log(`Test with: curl http://localhost:${port}/v1/hello`);
});
