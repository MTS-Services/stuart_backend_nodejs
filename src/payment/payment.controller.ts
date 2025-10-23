import { Body, Controller, Post } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { CreateSubscriptionDto } from './payment.dto';

@Controller('payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('create-subscription')
  async createSubscription(@Body() dto: CreateSubscriptionDto) {
    return this.paymentService.createSubscription(dto);
  }
}
