const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

const parsePagination = (query = {}, options = {}) => {
  const defaultLimit = options.defaultLimit ?? DEFAULT_LIMIT;
  const maxLimit = options.maxLimit ?? MAX_LIMIT;

  let page = Number.parseInt(query.page, 10);
  let limit = Number.parseInt(query.limit, 10);

  if (!Number.isInteger(page) || page < 1) page = DEFAULT_PAGE;
  if (!Number.isInteger(limit) || limit < 1) limit = defaultLimit;
  if (limit > maxLimit) limit = maxLimit;

  return { page, limit, offset: (page - 1) * limit };
};

const parseSort = (query = {}, allowedFields = [], defaultField = 'id') => {
  const field = allowedFields.includes(query.sort) ? query.sort : defaultField;
  const direction = String(query.order).toLowerCase() === 'asc' ? 'ASC' : 'DESC';
  return { field, direction };
};

const buildPaginatedResponse = (items, total, { page, limit }) => {
  const totalPages = Math.max(1, Math.ceil(total / limit));

  return {
    data: items,
    meta: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  };
};

module.exports = {
  parsePagination,
  parseSort,
  buildPaginatedResponse,
  DEFAULT_LIMIT,
  MAX_LIMIT,
};