

import { Body, Controller, Post, Headers, BadRequestException } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { CreateSubscriptionDto } from './payment.dto';

@Controller('payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  // 🚨 BETA TESTING: Direct payment bypass endpoint
  @Post('beta-bypass')
  async betaBypass(@Body() body: { email: string }) {
    return this.paymentService.bypassPaymentForBeta(body.email);
  }

  // ✅ Handles subscription creation request
  @Post('create-subscription')
  async createSubscription(@Body() dto: CreateSubscriptionDto) {
    return this.paymentService.createSubscription(dto);
  }

  // ✅ Handles one-time payments
  @Post('create-one-time-payment')
  async createOneTime(
    @Body() body: { email: string; amount: number; paymentMethodId: string },
  ) {
    return this.paymentService.createOneTimePayment(
      body.email,
      body.amount,
      body.paymentMethodId,
    );
  }

  // ✅ Webhook endpoint for Stripe events
  @Post('webhook')
  async handleWebhook(
    @Body() body: any,
    @Headers('stripe-signature') signature: string,
  ) {
    if (!signature) {
      throw new BadRequestException('Missing Stripe signature');
    }

    // Basic webhook handling - in production, verify the signature properly
    const event = body;

    try {
      switch (event.type) {
        case 'invoice.payment_failed':
          console.log('Payment failed for subscription:', event.data.object.subscription);
          // Ensure customer has default payment method for retry
          if (event.data.object.customer) {
            await this.paymentService.ensureCustomerHasDefaultPaymentMethod(
              event.data.object.customer
            );
          }
          break;

        case 'customer.subscription.updated':
          console.log('Subscription updated:', event.data.object.id);
          break;

        case 'payment_method.attached':
          console.log('Payment method attached:', event.data.object.id);
          break;

        default:
          console.log('Unhandled event type:', event.type);
      }

      return { received: true };
    } catch (error: any) {
      console.error('Webhook error:', error.message);
      throw new BadRequestException('Webhook processing failed');
    }
  }
}


