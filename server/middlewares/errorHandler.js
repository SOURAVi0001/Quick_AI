import { APIError } from './errors.js';

export const errorHandler = (err, req, res, _next) => {
  if (err instanceof APIError) {
    const response = {
      success: false,
      message: err.message,
    };

    if (err.details) response.details = err.details;
    if (err.retryAfter) res.set('Retry-After', String(err.retryAfter));

    return res.status(err.statusCode).json(response);
  }

  // CORS errors from Express
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({ success: false, message: 'CORS: Origin not allowed' });
  }

  // Unexpected errors - don't leak internals in production
  const isDev = process.env.NODE_ENV !== 'production';
  return res.status(500).json({
    success: false,
    message: isDev ? err.message : 'Internal server error',
    ...(isDev && { stack: err.stack }),
  });
};
