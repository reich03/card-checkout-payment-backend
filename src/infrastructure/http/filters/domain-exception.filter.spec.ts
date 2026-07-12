import { ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import {
  InsufficientStockError,
  ProductNotFoundError,
} from '../../../application/errors/application.errors';
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
});
