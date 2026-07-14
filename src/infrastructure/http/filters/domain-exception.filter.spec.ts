import {
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import {
  InsufficientStockError,
  PaymentProcessingError,
  ProductNotFoundError,
  ReceiptNotAvailableError,
  TransactionNotFoundError,
} from '../../../application/errors/application.errors';
import { PaymentGatewayHttpError } from '../../payment/payment-gateway.adapter';
import { DomainExceptionFilter } from './domain-exception.filter';

describe('DomainExceptionFilter', () => {
  const filter = new DomainExceptionFilter();

  const createHost = () => {
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const response = { status };
    const host = {
      switchToHttp: () => ({
        getResponse: () => response,
      }),
    } as unknown as ArgumentsHost;

    return { host, status, json };
  };

  it('maps ProductNotFoundError to 404', () => {
    const { host, status, json } = createHost();

    filter.catch(new ProductNotFoundError('prod-1'), host);

    expect(status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 404,
        message: 'Product not found: prod-1',
      }),
    );
  });

  it('maps InsufficientStockError to 409', () => {
    const { host, status } = createHost();

    filter.catch(new InsufficientStockError('prod-1', 3, 1), host);

    expect(status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
  });

  it('maps HttpException responses', () => {
    const { host, status, json } = createHost();

    filter.catch(new HttpException('Nope', HttpStatus.BAD_REQUEST), host);

    expect(status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Nope' }),
    );
  });

  it('maps HttpException with an object response body as-is', () => {
    const { host, status, json } = createHost();

    filter.catch(
      new HttpException(
        { statusCode: 400, message: ['field is required'] },
        HttpStatus.BAD_REQUEST,
      ),
      host,
    );

    expect(status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(json).toHaveBeenCalledWith({
      statusCode: 400,
      message: ['field is required'],
    });
  });

  it('maps TransactionNotFoundError to 404', () => {
    const { host, status, json } = createHost();

    filter.catch(new TransactionNotFoundError('tx-1'), host);

    expect(status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 404 }),
    );
  });

  it('maps ReceiptNotAvailableError to 409', () => {
    const { host, status, json } = createHost();

    filter.catch(new ReceiptNotAvailableError('tx-1', 'PENDING'), host);

    expect(status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 409 }),
    );
  });

  it('maps PaymentProcessingError to 502', () => {
    const { host, status, json } = createHost();

    filter.catch(new PaymentProcessingError('Gateway exploded'), host);

    expect(status).toHaveBeenCalledWith(HttpStatus.BAD_GATEWAY);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 502,
        message: 'Gateway exploded',
      }),
    );
  });

  it('maps PaymentGatewayHttpError with a client status to that status', () => {
    const { host, status, json } = createHost();

    filter.catch(
      new PaymentGatewayHttpError('Invalid public key', 401),
      host,
    );

    expect(status).toHaveBeenCalledWith(401);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Invalid public key' }),
    );
  });

  it('maps PaymentGatewayHttpError without a status (or 5xx) to 502', () => {
    const { host, status } = createHost();

    filter.catch(new PaymentGatewayHttpError('Timeout'), host);

    expect(status).toHaveBeenCalledWith(HttpStatus.BAD_GATEWAY);
  });

  it('maps a domain validation Error message to 400', () => {
    const { host, status, json } = createHost();

    filter.catch(new Error('Card number is required'), host);

    expect(status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 400,
        message: 'Card number is required',
      }),
    );
  });

  it('maps an unrecognized Error to 500 without leaking the message', () => {
    const { host, status, json } = createHost();
    const loggerSpy = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);

    filter.catch(new Error('Unexpected database failure'), host);

    expect(status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 500,
        message: 'Internal server error',
      }),
    );
    expect(loggerSpy).toHaveBeenCalled();
    loggerSpy.mockRestore();
  });

  it('maps a non-Error thrown value to 500', () => {
    const { host, status, json } = createHost();
    const loggerSpy = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);

    filter.catch('just a string', host);

    expect(status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 500 }),
    );
    expect(loggerSpy).toHaveBeenCalled();
    loggerSpy.mockRestore();
  });
});
