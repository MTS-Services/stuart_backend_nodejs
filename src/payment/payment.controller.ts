

import { Body, Controller, Post } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { CreateSubscriptionDto } from './payment.dto';

@Controller('payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  // ✅ Handles subscription creation request
  @Post('create-subscription')
  async createSubscription(@Body() dto: CreateSubscriptionDto) {
    return this.paymentService.createSubscription(dto);
  }

  // ✅ (Optional) Add endpoint for one-time payments
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
}


