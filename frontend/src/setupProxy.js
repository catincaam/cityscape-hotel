// This proxy config will forward API requests from the frontend to the backend
// Place this file in frontend/ as 'setupProxy.js' if using react-scripts (CRA)

const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  app.use(
    '/api',
    createProxyMiddleware({
      target: 'http://localhost:9001',
      changeOrigin: true,
    })
  );
};
