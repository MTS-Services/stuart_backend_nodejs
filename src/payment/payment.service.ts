import {
  Injectable,
  InternalServerErrorException,
  BadRequestException,
} from '@nestjs/common';
import { CreateSubscriptionDto } from './payment.dto';
import Stripe from 'stripe';
import { PrismaService } from '../prisma.service';

@Injectable()
export class PaymentService {
  private stripe: Stripe;

  constructor(private readonly prisma: PrismaService) {
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) {
      throw new Error('Missing STRIPE_SECRET_KEY in environment variables');
    }

    // ✅ Use correct Stripe version initialization
    this.stripe = new Stripe(stripeKey, { apiVersion: '2025-09-30.clover' });

  }

  /**
   * Handles one-time setup payment
   */
  async createOneTimePayment(
  email: string,
  amount: number,
  paymentMethodId: string,
) {
  // ✅ Find user by email
  const user = await this.prisma.user.findUnique({ where: { email } });
  if (!user) throw new BadRequestException('User not found');

  if (user.paidSetupFee) {
    return { message: 'One-time payment already completed' };
  }

  // ✅ Create Stripe PaymentIntent (non-redirect, card-only)
  const paymentIntent = await this.stripe.paymentIntents.create({
    amount,
    currency: 'usd',
    payment_method: paymentMethodId,
    confirm: true,
    automatic_payment_methods: {
      enabled: true,
      allow_redirects: 'never',
    },
  });

  // ✅ Save payment record
  await this.prisma.payment.create({
    data: {
      userId: user.id,
      amount,
      stripePaymentIntentId: paymentIntent.id,
      type: 'ONE_TIME',
      status: 'COMPLETED',
    },
  });

  // ✅ Update user record
  await this.prisma.user.update({
    where: { id: user.id },
    data: { paidSetupFee: true },
  });

  // ✅ Return Stripe and user info
  return {
    success: true,
    message: 'One-time payment successful',
    email: user.email,
    amount,
    paymentIntentId: paymentIntent.id,
    status: paymentIntent.status,
  };
}


  /**
   * Handles recurring subscription creation (Stripe)
   */
  async createSubscription(dto: CreateSubscriptionDto): Promise<any> {
  const { email, paymentMethodId, priceId } = dto;

  try {
    // ✅ 1. Find or create Stripe customer
    const existing = await this.stripe.customers.list({ email, limit: 1 });
    const customer =
      existing.data.length > 0
        ? existing.data[0]
        : await this.stripe.customers.create({
            email,
            payment_method: paymentMethodId,
            invoice_settings: {
              default_payment_method: paymentMethodId,
            },
          });

    // ✅ 2. Attach payment method to customer (if not already)
    await this.stripe.paymentMethods.attach(paymentMethodId, {
      customer: customer.id,
    });

    // ✅ 3. Create Stripe subscription
    const subscription = await this.stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price: priceId }],
      expand: ['latest_invoice.payment_intent'],
    });

    // ✅ 4. Extract client secret for frontend
    const invoice = subscription.latest_invoice as Stripe.Invoice & {
      payment_intent?: Stripe.PaymentIntent | string;
    };

    let clientSecret: string | null = null;
    if (
      invoice &&
      invoice.payment_intent &&
      typeof invoice.payment_intent !== 'string'
    ) {
      clientSecret = invoice.payment_intent.client_secret ?? null;
    }

    // ✅ 5. Find local user
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user)
      throw new InternalServerErrorException('User not found in local DB.');

    // ✅ 6. Upsert subscription record
    const plan = 'MONTHLY';
    const status = 'ACTIVE';
    const amount = 13.0;

    await this.prisma.subscription.upsert({
      where: { userId: user.id },
      update: {
        plan,
        status,
        amount,
        currency: 'USD',
        stripeCustomerId: customer.id,
        stripeSubscriptionId: subscription.id,
        startDate: new Date(),
        endDate: null,
      },
      create: {
        userId: user.id,
        plan,
        status,
        amount,
        currency: 'USD',
        stripeCustomerId: customer.id,
        stripeSubscriptionId: subscription.id,
        startDate: new Date(),
      },
    });

    // ✅ 7. Update user paidSetupFee
    await this.prisma.user.update({
      where: { id: user.id },
      data: { paidSetupFee: true },
    });

    // ✅ 8. Return full response (as you requested)
    return {
      success: true,
      message: 'Subscription created successfully.',
      subscriptionId: subscription.id,
      customerId: customer.id,
      plan,
      status,
      amount,
      clientSecret,
      stripeStatus: subscription.status,
    };
  } catch (error: any) {
    console.error('❌ Subscription creation failed:', error);

    if (error instanceof Stripe.errors.StripeError) {
      throw new BadRequestException(error.message);
    }

    throw new InternalServerErrorException(error.message || 'Server error');
  }
}
}