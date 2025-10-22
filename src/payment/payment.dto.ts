import { IsString, IsNotEmpty, IsEmail } from 'class-validator';

/**
 * DTO for simple one-time payment request.
 */
export class SimplePaymentDto {
  @IsEmail({}, { message: 'email must be a valid email address' })
  @IsNotEmpty({ message: 'email is required' })
  readonly email: string;

  @IsString({ message: 'paymentMethodId must be a string' })
  @IsNotEmpty({ message: 'paymentMethodId is required' })
  readonly paymentMethodId: string;

  @IsString({ message: 'priceId must be a string' })
  @IsNotEmpty({ message: 'priceId is required' })
  readonly priceId: string;
}
