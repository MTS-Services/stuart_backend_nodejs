import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class CreateSubscriptionDto {
  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  paymentMethodId: string;

  @IsString()
  @IsNotEmpty()
  priceId: string;
}
