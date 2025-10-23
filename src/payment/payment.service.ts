import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateSubscriptionDto } from './payment.dto';
import Stripe from 'stripe';

@Injectable()
export class PaymentService {
  private stripe: Stripe;

  constructor(private readonly prisma: PrismaService) {
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) {
      throw new Error('Missing STRIPE_SECRET_KEY in environment variables');
    }

    this.stripe = new Stripe(stripeKey);
  }

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

      // ✅ 2. Attach payment method
      await this.stripe.paymentMethods.attach(paymentMethodId, {
        customer: customer.id,
      });

      // ✅ 3. Create subscription
      const subscription = await this.stripe.subscriptions.create({
        customer: customer.id,
        items: [{ price: priceId }],
        payment_behavior: 'default_incomplete',
        expand: ['latest_invoice.payment_intent'],
      });

      // ✅ 4. Extract client secret safely
      interface ExpandedInvoice extends Stripe.Invoice {
        payment_intent?: Stripe.PaymentIntent | string;
      }

      const invoice = subscription.latest_invoice as ExpandedInvoice;
      let clientSecret: string | null = null;

      if (invoice && invoice.payment_intent && typeof invoice.payment_intent !== 'string') {
        clientSecret = invoice.payment_intent.client_secret ?? null;
      }

      // ✅ 5. Update Prisma user record → paidSetupFee = true
      const user = await this.prisma.user.update({
        where: { email },
        data: {
          paidSetupFee: true,
          stripeCustomerId: customer.id,
        },
      });

      // ✅ 6. Save subscription info to DB
      await this.prisma.subscription.create({
        data: {
          userId: user.id,
          plan: 'MONTHLY', // you can adjust dynamically
          status: 'ACTIVE',
          amount: 13.0,
          currency: 'USD',
          stripeCustomerId: customer.id,
          stripeSubscriptionId: subscription.id,
          startDate: new Date(),
        },
      });

      // ✅ 7. Return response
      return {
        success: true,
        message: 'Subscription created successfully.',
        subscriptionId: subscription.id,
        customerId: customer.id,
        clientSecret,
        status: subscription.status,
      };
    } catch (error) {
      console.error('❌ Subscription creation failed:', error);
      throw new InternalServerErrorException(error.message);
    }
  }
}
