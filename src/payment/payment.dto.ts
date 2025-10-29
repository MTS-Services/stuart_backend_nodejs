import { IsEmail, IsNotEmpty, IsNumber, IsString, IsEnum, IsOptional } from 'class-validator';

export enum SubscriptionPlan {
  MONTHLY = 'MONTHLY',
  YEARLY = 'YEARLY',
}

export class CreateSubscriptionDto {
  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  paymentMethodId: string;

  @IsString()
  @IsNotEmpty()
  priceId: string;

  @IsNumber()
  @IsOptional()
  setupFeeAmount?: number; // optional one-time setup fee

  @IsEnum(SubscriptionPlan)
  plan: SubscriptionPlan;
}



// import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

// export class CreateSubscriptionDto {
//   @IsEmail()
//   email: string;

//   @IsString()
//   @IsNotEmpty()
//   paymentMethodId: string;

//   @IsString()
//   @IsNotEmpty()
//   priceId: string;
// }
