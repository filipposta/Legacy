"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var vite_1 = require("vite");
var plugin_react_1 = require("@vitejs/plugin-react");
// https://vitejs.dev/config/
exports.default = (0, vite_1.defineConfig)({
    plugins: [(0, plugin_react_1.default)()],
    define: {
        global: 'globalThis',
    },
    envPrefix: 'VITE_', // Ensure VITE_ prefixed env vars are loaded
    server: {
        port: 5173,
        host: true
    }
});
