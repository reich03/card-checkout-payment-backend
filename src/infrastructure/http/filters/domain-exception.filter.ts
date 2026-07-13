import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import {
  InsufficientStockError,
  PaymentProcessingError,
  ProductNotFoundError,
  TransactionNotFoundError,
} from '../../../application/errors/application.errors';
import { PaymentGatewayHttpError } from '../../payment/payment-gateway.adapter';

@Catch()
export class DomainExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(DomainExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    if (this.isHttpException(exception)) {
      const status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      response
        .status(status)
        .json(
          typeof exceptionResponse === 'string'
            ? { statusCode: status, message: exceptionResponse }
            : exceptionResponse,
        );
      return;
    }

    if (exception instanceof ProductNotFoundError) {
      this.send(response, HttpStatus.NOT_FOUND, exception.message);
      return;
    }

    if (exception instanceof TransactionNotFoundError) {
      this.send(response, HttpStatus.NOT_FOUND, exception.message);
      return;
    }

    if (exception instanceof InsufficientStockError) {
      this.send(response, HttpStatus.CONFLICT, exception.message);
      return;
    }

    if (exception instanceof PaymentProcessingError) {
      this.send(response, HttpStatus.BAD_GATEWAY, exception.message);
      return;
    }

    if (exception instanceof PaymentGatewayHttpError) {
      this.send(
        response,
        exception.statusCode && exception.statusCode < 500
          ? exception.statusCode
          : HttpStatus.BAD_GATEWAY,
        exception.message,
      );
      return;
    }

    if (exception instanceof Error) {
      const isDomainValidation =
        /required|must be|cannot be|invalid|expired|Insufficient stock/i.test(
          exception.message,
        );

      if (isDomainValidation) {
        this.send(response, HttpStatus.BAD_REQUEST, exception.message);
        return;
      }

      this.logger.error(exception.message, exception.stack);
      this.send(
        response,
        HttpStatus.INTERNAL_SERVER_ERROR,
        'Internal server error',
      );
      return;
    }

    this.logger.error('Unhandled non-error exception', exception as object);
    this.send(
      response,
      HttpStatus.INTERNAL_SERVER_ERROR,
      'Internal server error',
    );
  }

  private send(response: Response, statusCode: number, message: string): void {
    response.status(statusCode).json({
      statusCode,
      message,
      error: HttpStatus[statusCode] ?? 'Error',
    });
  }

  private isHttpException(exception: unknown): exception is {
    getStatus: () => number;
    getResponse: () => string | object;
  } {
    return (
      typeof exception === 'object' &&
      exception !== null &&
      typeof (exception as { getStatus?: unknown }).getStatus === 'function' &&
      typeof (exception as { getResponse?: unknown }).getResponse === 'function'
    );
  }
}
