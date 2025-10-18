import { 
  Controller, 
  Post, 
  Get, 
  Body, 
  UseGuards, 
  Request, 
  HttpException,
  HttpStatus,
  Param
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PaymentService } from './payment.service';
import { IsIn, IsString } from 'class-validator';

export class CreateSubscriptionDto {
  @IsIn(['MONTHLY', 'YEARLY'])
  plan: 'MONTHLY' | 'YEARLY';
}

export class ConfirmPaymentDto {
  @IsString()
  paymentIntentId: string;
}

export class CreateSubscriptionByEmailDto {
  @IsString()
  email: string;
  
  @IsIn(['MONTHLY', 'YEARLY'])
  plan: 'MONTHLY' | 'YEARLY';
}

export class CancelSubscriptionByEmailDto {
  @IsString()
  email: string;
}

export class CreateSetupFeeDto {
  @IsString()
  email: string;
}

@Controller('payment')
export class PaymentController {
  constructor(private paymentService: PaymentService) {}

  @Post('setup-fee')
  async paySetupFee(@Body() createSetupFeeDto: CreateSetupFeeDto) {
    return this.paymentService.paySetupFeeByEmail(createSetupFeeDto.email);
  }

  @Post('confirm-setup-fee')
  async confirmSetupFee(@Body() confirmPaymentDto: ConfirmPaymentDto) {
    return this.paymentService.confirmSetupFeePayment(confirmPaymentDto.paymentIntentId);
  }

  @Post('subscription/by-email')
  async createSubscriptionByEmail(@Body() createSubscriptionDto: CreateSubscriptionByEmailDto) {
    return this.paymentService.createSubscriptionByEmail(createSubscriptionDto.email, createSubscriptionDto.plan);
  }

  @Post('subscription')
  @UseGuards(AuthGuard('jwt'))
  async createSubscription(@Request() req, @Body() createSubscriptionDto: CreateSubscriptionDto) {
    return this.paymentService.createSubscription(req.user.id, createSubscriptionDto.plan as any);
  }

  @Get('payments/:email')
  async getUserPaymentsByEmail(@Param('email') email: string) {
    return this.paymentService.getUserPaymentsByEmail(email);
  }

  @Get('payments')
  @UseGuards(AuthGuard('jwt'))
  async getUserPayments(@Request() req) {
    return this.paymentService.getUserPayments(req.user.id);
  }

  @Get('subscription/:email')
  async getUserSubscriptionByEmail(@Param('email') email: string) {
    return this.paymentService.getUserSubscriptionByEmail(email);
  }

  @Get('subscription')
  @UseGuards(AuthGuard('jwt'))
  async getUserSubscription(@Request() req) {
    return this.paymentService.getUserSubscription(req.user.id);
  }

  @Post('subscription/cancel/by-email')
  async cancelSubscriptionByEmail(@Body() cancelSubscriptionDto: CancelSubscriptionByEmailDto) {
    return this.paymentService.cancelSubscriptionByEmail(cancelSubscriptionDto.email);
  }

  @Post('subscription/cancel')
  @UseGuards(AuthGuard('jwt'))
  async cancelSubscription(@Request() req) {
    return this.paymentService.cancelSubscription(req.user.id);
  }

  // ✅ TEST/DEMO ENDPOINT: Simulate payment completion for testing
  @Post('demo/complete-payment/:paymentIntentId')
  async simulatePaymentCompletion(@Param('paymentIntentId') paymentIntentId: string) {
    return this.paymentService.simulateSetupFeePaymentCompletion(paymentIntentId);
  }
}