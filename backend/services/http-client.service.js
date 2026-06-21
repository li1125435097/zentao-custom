'use strict';

const { request: httpsRequest } = require('node:https');
const { request: httpRequest } = require('node:http');
const { URL } = require('node:url');
const { logApiRequest, logApiResponse } = require('./api-logger.service');

function request(urlString, options = {}) {
  const {
    method = 'GET',
    headers = {},
    body,
    timeout = 30000,
  } = options;

  return new Promise((resolve) => {
    let url;
    try {
      url = new URL(urlString);
    } catch (error) {
      resolve({
        ok: false,
        status: 0,
        error: `无效 URL: ${error.message}`,
      });
      return;
    }

    const reqHeaders = { ...headers };
    let payload = null;

    if (body != null) {
      if (typeof body === 'string') {
        payload = body;
      } else {
        payload = JSON.stringify(body);
        if (!reqHeaders['Content-Type']) {
          reqHeaders['Content-Type'] = 'application/json';
        }
      }
      reqHeaders['Content-Length'] = Buffer.byteLength(payload);
    }

    const startedAt = Date.now();
    logApiRequest({
      method,
      url: urlString,
      headers: reqHeaders,
      body,
    });

    const transport = url.protocol === 'https:' ? httpsRequest : httpRequest;
    const req = transport(
      {
        protocol: url.protocol,
        hostname: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path: `${url.pathname}${url.search}`,
        method,
        headers: reqHeaders,
        rejectUnauthorized: false,
      },
      (res) => {
        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => {
          const text = Buffer.concat(chunks).toString('utf8');
          let data = null;

          if (text.trim()) {
            try {
              data = JSON.parse(text);
            } catch {
              data = text;
            }
          }

          const durationMs = Date.now() - startedAt;

          if (res.statusCode >= 400) {
            const result = {
              ok: false,
              status: res.statusCode,
              error: data ?? text,
            };
            logApiResponse({
              method,
              url: urlString,
              status: res.statusCode,
              ok: false,
              error: result.error,
              durationMs,
            });
            resolve(result);
            return;
          }

          const result = {
            ok: true,
            status: res.statusCode,
            data,
          };
          logApiResponse({
            method,
            url: urlString,
            status: res.statusCode,
            ok: true,
            data,
            durationMs,
          });
          resolve(result);
        });
      },
    );

    req.setTimeout(timeout, () => {
      req.destroy(new Error(`请求超时（${timeout}ms）`));
    });

    req.on('error', (error) => {
      const result = {
        ok: false,
        status: 0,
        error: `网络错误: ${error.message}`,
      };
      logApiResponse({
        method,
        url: urlString,
        status: 0,
        ok: false,
        error: result.error,
        durationMs: Date.now() - startedAt,
      });
      resolve(result);
    });

    if (payload != null) {
      req.write(payload);
    }
    req.end();
  });
}

module.exports = { request };
