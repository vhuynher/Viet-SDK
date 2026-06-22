export class LotrError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LotrError';
  }
}

export class AuthenticationError extends LotrError {
  constructor(message = 'Invalid or missing API token') {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class NotFoundError extends LotrError {
  readonly resource: string;
  readonly id: string;

  constructor(resource: string, id: string) {
    super(`${resource} not found: ${id}`);
    this.name = 'NotFoundError';
    this.resource = resource;
    this.id = id;
  }
}

export class RateLimitError extends LotrError {
  readonly status: number;

  constructor(message = 'Rate limit exceeded', status = 429) {
    super(message);
    this.name = 'RateLimitError';
    this.status = status;
  }
}

export class ApiError extends LotrError {
  readonly status: number;
  readonly body?: unknown;

  constructor(status: number, message: string, body?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}
