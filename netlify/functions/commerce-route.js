'use strict';

const api = require('./api.js');

const safe = (value, max = 160) => String(value || '').trim().slice(0, max);

exports.handler = async (event, context) => {
  const query = event.queryStringParameters || {};
  const kind = safe(query.kind, 30);
  let route = '';

  if (kind === 'health') route = 'health/ready';
  else if (kind === 'lookup') route = 'orders/lookup';
  else if (kind === 'action') {
    const order = safe(query.order, 120);
    const action = safe(query.action, 30);
    if (!order || !['payment-notice', 'cancel'].includes(action)) {
      return {
        statusCode: 400,
        headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
        body: JSON.stringify({ ok: false, code: 'INVALID_ORDER_ACTION', message: '주문 요청 경로를 확인해 주세요.' })
      };
    }
    route = `orders/${order}/${action}`;
  }

  if (!route) {
    return {
      statusCode: 404,
      headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
      body: JSON.stringify({ ok: false, code: 'NOT_FOUND', message: 'API route not found.' })
    };
  }

  return api.handler({
    ...event,
    queryStringParameters: { ...query, route }
  }, context);
};
