export class APIError extends Error {
  constructor(statusCode, message, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true;
  }
}

export class ValidationError extends APIError {
  constructor(message, details) {
    super(400, message, details);
  }
}

export class AuthenticationError extends APIError {
  constructor(message = 'Unauthenticated') {
    super(401, message);
  }
}

export class ForbiddenError extends APIError {
  constructor(message = 'Access denied. Upgrade to Premium.') {
    super(403, message);
  }
}

export class NotFoundError extends APIError {
  constructor(resource = 'Resource') {
    super(404, `${resource} not found`);
  }
}

export class RateLimitError extends APIError {
  constructor(retryAfter) {
    super(429, 'Too many requests. Please slow down.');
    this.retryAfter = retryAfter;
  }
}
