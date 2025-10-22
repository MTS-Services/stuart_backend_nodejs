import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { SimplePaymentDto } from './payment.dto';

@Controller('payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('simple-payment')
  @HttpCode(HttpStatus.OK)
  async simplePayment(@Body() simplePaymentDto: SimplePaymentDto) {
    const result = await this.paymentService.simplePayment(simplePaymentDto);
    return {
      statusCode: HttpStatus.OK,
      message: 'Payment request completed.',
      data: result,
    };
  }
}
