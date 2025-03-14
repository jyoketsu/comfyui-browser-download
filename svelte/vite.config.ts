import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [sveltekit()],
  server: {
    host: true,
    proxy: {
      '/api': {
        target: 'https://952923538065592321-comfyui.east1.waas.aigate.cc', // 后端服务器地址
        changeOrigin: true, // 允许跨域
        rewrite: (path) => path.replace(/^\/api/, ''), // 可选：重写路径
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq, req, res) => {
            console.log(`Proxying request: ${req.url}`);
          });
        },
      },
      '/browser': {
        target: 'https://952923538065592321-comfyui.east1.waas.aigate.cc',
      },
    },
  },
});
