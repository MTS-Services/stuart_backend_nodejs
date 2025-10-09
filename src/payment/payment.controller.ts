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

@Controller('payment')
@UseGuards(AuthGuard('jwt'))
export class PaymentController {
  constructor(private paymentService: PaymentService) {}

  @Post('setup-fee')
  async paySetupFee(@Request() req) {
    return this.paymentService.paySetupFee(req.user.id);
  }

  @Post('confirm-setup-fee')
  async confirmSetupFee(@Body() confirmPaymentDto: ConfirmPaymentDto) {
    return this.paymentService.confirmSetupFeePayment(confirmPaymentDto.paymentIntentId);
  }

  @Post('subscription')
  async createSubscription(@Request() req, @Body() createSubscriptionDto: CreateSubscriptionDto) {
    return this.paymentService.createSubscription(req.user.id, createSubscriptionDto.plan as any);
  }

  @Get('payments')
  async getUserPayments(@Request() req) {
    return this.paymentService.getUserPayments(req.user.id);
  }

  @Get('subscription')
  async getUserSubscription(@Request() req) {
    return this.paymentService.getUserSubscription(req.user.id);
  }

  @Post('subscription/cancel')
  async cancelSubscription(@Request() req) {
    return this.paymentService.cancelSubscription(req.user.id);
  }
}