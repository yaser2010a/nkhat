'use strict';

const env = require('../config/env');

function parsePagination(query) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  let limit = parseInt(query.limit, 10) || env.pagination.defaultLimit;
  limit = Math.min(Math.max(1, limit), env.pagination.maxLimit);
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

function paginatedResponse(items, total, page, limit) {
  const totalPages = Math.ceil(total / limit) || 1;
  return {
    success: true,
    data: items,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  };
}

module.exports = { parsePagination, paginatedResponse };
