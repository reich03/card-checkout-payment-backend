import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PAYMENT_GATEWAY } from '../../domain/ports/payment.gateway.port';
import { PaymentGatewayAdapter } from '../payment/payment-gateway.adapter';
import { loadPaymentGatewayConfig } from '../payment/payment-gateway.config';

@Global()
@Module({
  providers: [
    {
      provide: PAYMENT_GATEWAY,
      useFactory: (config: ConfigService) => {
        const paymentConfig = loadPaymentGatewayConfig({
          PAYMENT_API_BASE_URL: config.get<string>('PAYMENT_API_BASE_URL'),
          PAYMENT_API_PUBLIC_KEY: config.get<string>('PAYMENT_API_PUBLIC_KEY'),
          PAYMENT_API_PRIVATE_KEY: config.get<string>(
            'PAYMENT_API_PRIVATE_KEY',
          ),
          PAYMENT_API_INTEGRITY_KEY: config.get<string>(
            'PAYMENT_API_INTEGRITY_KEY',
          ),
          PAYMENT_API_TIMEOUT_MS: config.get<string>('PAYMENT_API_TIMEOUT_MS'),
        });

        return new PaymentGatewayAdapter(paymentConfig);
      },
      inject: [ConfigService],
    },
  ],
  exports: [PAYMENT_GATEWAY],
})
export class PaymentModule {}
