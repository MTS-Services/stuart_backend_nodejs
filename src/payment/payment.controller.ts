import { 
  Controller, 
  Post, 
  Get, 
  Body, 
  HttpException,
  HttpStatus,
  Param
} from '@nestjs/common';
import { PaymentService } from './payment.service';
import { IsString } from 'class-validator';

// --- DTOs for remaining functionality ---

export class SimplePaymentDto {
  @IsString()
  email: string;

  @IsString()
  paymentMethodId: string;

  @IsString()
  priceId: string;
}

// NOTE: Retaining the PaySetupFee DTO for the simplified path (if needed)
export class CreateSetupFeeDto {
  @IsString()
  email: string;
}

export class ConfirmPaymentDto {
  @IsString()
  paymentIntentId: string;
}


@Controller('payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Get('debug/mode')
  getPaymentMode() {
    return this.paymentService.getPaymentMode();
  }

  // 1. Simplified payment route with email, paymentMethodId, and priceId (The main retained function)
  @Post('simple-payment')
  async simplePayment(@Body() paymentDto: SimplePaymentDto) {
    return this.paymentService.processSimplePayment(
      paymentDto.email, 
      paymentDto.paymentMethodId, 
      paymentDto.priceId
    );
  }

  // 2. Setup Fee Initiation (Email-based) - Retained for flow compatibility
  @Post('setup-fee')
  async paySetupFee(@Body() createSetupFeeDto: CreateSetupFeeDto) {
    return this.paymentService.paySetupFeeByEmail(createSetupFeeDto.email);
  }

  // 3. Setup Fee Confirmation - Retained for flow compatibility
  @Post('confirm-setup-fee')
  async confirmSetupFee(@Body() confirmPaymentDto: ConfirmPaymentDto) {
    return this.paymentService.confirmSetupFeePayment(confirmPaymentDto.paymentIntentId);
  }

  // 4. Payments/History - Retained for user visibility
  @Get('payments/:email')
  async getUserPaymentsByEmail(@Param('email') email: string) {
    return this.paymentService.getUserPaymentsByEmail(email);
  }

  // 5. TEST/DEMO ENDPOINT: Simulate payment completion for testing
  @Post('demo/complete-payment/:paymentIntentId')
  async simulatePaymentCompletion(@Param('paymentIntentId') paymentIntentId: string) {
    return this.paymentService.simulateSetupFeePaymentCompletion(paymentIntentId);
  }
}