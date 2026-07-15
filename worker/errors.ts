import type { ApiErrorBody } from '../src/shared/protocol';

export interface PublicError {
  code: string;
  message: string;
  status: number;
  title?: string;
}

export type RpcResult<T> = { ok: true; value: T } | { ok: false; error: PublicError };

export class RoomError extends Error {
  readonly code: string;
  readonly status: number;
  readonly title?: string;

  constructor(code: string, message: string, status = 400, title?: string) {
    super(message);
    this.name = 'RoomError';
    this.code = code;
    this.status = status;
    this.title = title;
  }

  toPublicError(): PublicError {
    return {
      code: this.code,
      message: this.message,
      status: this.status,
      ...(this.title === undefined ? {} : { title: this.title }),
    };
  }
}

export function asRoomError(error: unknown): RoomError {
  if (error instanceof RoomError) {
    return error;
  }

  console.error('Unexpected room error', error);
  return new RoomError('INTERNAL_ERROR', 'Something went wrong.', 500);
}

export function apiErrorBody(error: PublicError): ApiErrorBody {
  return {
    error: {
      code: error.code,
      message: error.message,
      ...(error.title === undefined ? {} : { title: error.title }),
    },
  };
}
