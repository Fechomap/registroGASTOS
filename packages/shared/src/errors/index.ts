import { ERROR_CODES } from '../utils/constants';

export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details?: unknown;

  constructor(
    message: string,
    code: string = ERROR_CODES.INTERNAL_ERROR,
    statusCode: number = 500,
    details?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;

    // Mantener el stack trace
    Error.captureStackTrace(this, AppError);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, ERROR_CODES.VALIDATION_ERROR, 400, details);
    this.name = 'ValidationError';
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'No autorizado') {
    super(message, ERROR_CODES.UNAUTHORIZED, 401);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Acceso prohibido') {
    super(message, ERROR_CODES.FORBIDDEN, 403);
    this.name = 'ForbiddenError';
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Recurso no encontrado') {
    super(message, ERROR_CODES.NOT_FOUND, 404);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends AppError {
  constructor(message: string = 'Conflicto con el estado actual') {
    super(message, ERROR_CODES.CONFLICT, 409);
    this.name = 'ConflictError';
  }
}

export class ExternalServiceError extends AppError {
  constructor(message: string, service: string, details?: Record<string, unknown>) {
    super(message, ERROR_CODES.EXTERNAL_SERVICE_ERROR, 502, { service, ...(details || {}) });
    this.name = 'ExternalServiceError';
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Límite de velocidad excedido') {
    super(message, ERROR_CODES.RATE_LIMIT_EXCEEDED, 429);
    this.name = 'RateLimitError';
  }
}

// Función helper para crear errores de validación desde Zod
export function createValidationError(zodError: {
  errors?: Array<{ path: Array<string | number>; message: string }>;
}): ValidationError {
  const message =
    zodError.errors?.map(err => `${err.path.join('.')}: ${err.message}`).join(', ') ||
    'Datos inválidos';

  return new ValidationError(message, zodError.errors);
}

// Función helper para determinar si un error es conocido
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

// Función helper para convertir errores desconocidos
export function normalizeError(error: unknown): AppError {
  if (isAppError(error)) {
    return error;
  }

  if (error instanceof Error) {
    return new AppError(error.message, ERROR_CODES.INTERNAL_ERROR, 500, {
      originalError: error.name,
      stack: error.stack,
    });
  }

  return new AppError('Error desconocido', ERROR_CODES.INTERNAL_ERROR, 500, {
    originalError: String(error),
  });
}
