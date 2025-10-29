// import { Injectable, BadRequestException } from '@nestjs/common';
// import Stripe from 'stripe';
// import { PrismaService } from '../prisma.service';
// import { CreateSubscriptionDto } from './payment.dto';

// @Injectable()
// export class PaymentService {
//   private stripe: Stripe;

//   constructor(private readonly prisma: PrismaService) {
//     const stripeKey = process.env.STRIPE_SECRET_KEY || '';
//     this.stripe = new Stripe(stripeKey, { apiVersion: '2025-09-30.clover' });
//   }

//   async createOneTimePayment(userId: number, amount: number, paymentMethodId: string) {
//     const user = await this.prisma.user.findUnique({ where: { id: userId } });
//     if (!user) throw new BadRequestException('User not found');

//     if (user.paidSetupFee) {
//       return { message: 'One-time payment already completed' };
//     }

//     const paymentIntent = await this.stripe.paymentIntents.create({
//       amount,
//       currency: 'usd',
//       payment_method: paymentMethodId,
//       confirm: true,
//     });

//     await this.prisma.payment.create({
//       data: {
//         userId: user.id,
//         amount,
//         stripePaymentId: paymentIntent.id,
//       },
//     });

//     await this.prisma.user.update({
//       where: { id: user.id },
//       data: { paidSetupFee: true },
//     });

//     return paymentIntent;
//   }

//   async createSubscription(userId: number, dto: CreateSubscriptionDto) {
//     const user = await this.prisma.user.findUnique({ where: { id: userId } });
//     if (!user) throw new BadRequestException('User not found');

//     let stripeCustomerId = user.stripeCustomerId;
//     if (!stripeCustomerId) {
//       const customer = await this.stripe.customers.create({ email: user.email });
//       stripeCustomerId = customer.id;
//       await this.prisma.user.update({ where: { id: user.id }, data: { stripeCustomerId } });
//     }

//     await this.stripe.paymentMethods.attach(dto.paymentMethodId, { customer: stripeCustomerId });
//     await this.stripe.customers.update(stripeCustomerId, {
//       invoice_settings: { default_payment_method: dto.paymentMethodId },
//     });

//     const subscription = await this.stripe.subscriptions.create({
//       customer: stripeCustomerId,
//       items: [{ price: dto.priceId }],
//       expand: ['latest_invoice.payment_intent'],
//     });

//     const stripeSub = subscription as Stripe.Subscription;

//     const startDate = new Date((stripeSub.start_date ?? Date.now() / 1000) * 1000);
//     const endDate = new Date(
//       ((stripeSub.current_period_end ?? stripeSub.start_date ?? Date.now() / 1000) as number) * 1000
//     );

//     return this.prisma.subscription.create({
//       data: {
//         userId: user.id,
//         stripeSubscriptionId: stripeSub.id,
//         startDate,
//         endDate,
//         plan: dto.plan ?? 'DEFAULT',
//         status: mapStripeStatusToPrisma(stripeSub.status),
//       },
//     });
//   }

//   async getUserSubscriptions(userId: number) {
//     return this.prisma.subscription.findMany({ where: { userId } });
//   }
// }

// function mapStripeStatusToPrisma(status: Stripe.Subscription.Status) {
//   switch (status) {
//     case 'active':
//       return 'ACTIVE';
//     case 'incomplete':
//       return 'INCOMPLETE';
//     case 'canceled':
//       return 'CANCELLED';
//     case 'past_due':
//       return 'PAST_DUE';
//     default:
//       return 'INCOMPLETE';
//   }
// }




import { Injectable, InternalServerErrorException } from '@nestjs/common';
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

    this.stripe = new Stripe(stripeKey);
  }

  async createSubscription(dto: CreateSubscriptionDto): Promise<any> {
    const { email, paymentMethodId, priceId } = dto;

    try {
      // ✅ 1. Find or create a customer
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

      // ✅ 2. Attach payment method to customer
      await this.stripe.paymentMethods.attach(paymentMethodId, {
        customer: customer.id,
      });

      // ✅ 3. Create Stripe subscription (appears in Dashboard → Subscriptions)
      const subscription = await this.stripe.subscriptions.create({
        customer: customer.id,
        items: [{ price: priceId }],
        expand: ['latest_invoice.payment_intent'],
      });

      // ✅ 4. Get client secret for front-end confirmation (if needed)
      interface ExpandedInvoice extends Stripe.Invoice {
        payment_intent?: Stripe.PaymentIntent | string;
      }

      const invoice = subscription.latest_invoice as ExpandedInvoice;
      let clientSecret: string | null = null;
      if (invoice && invoice.payment_intent && typeof invoice.payment_intent !== 'string') {
        clientSecret = invoice.payment_intent.client_secret ?? null;
      }

      // ✅ 5. Find local user
      const user = await this.prisma.user.findUnique({
        where: { email },
      });

      if (!user) throw new InternalServerErrorException('User not found.');

      // ✅ 6. Upsert subscription record in DB
      await this.prisma.subscription.upsert({
        where: { userId: user.id },
        update: {
          plan: 'MONTHLY', // or derive dynamically from price metadata
          status: 'ACTIVE',
          amount: 13.0,
          currency: 'USD',
          stripeCustomerId: customer.id,
          stripeSubscriptionId: subscription.id,
          startDate: new Date(),
          endDate: null,
        },
        create: {
          userId: user.id,
          plan: 'MONTHLY',
          status: 'ACTIVE',
          amount: 13.0,
          currency: 'USD',
          stripeCustomerId: customer.id,
          stripeSubscriptionId: subscription.id,
          startDate: new Date(),
        },
      });

      // ✅ 7. Update user's paidSetupFee → true
      await this.prisma.user.update({
        where: { id: user.id },
        data: { paidSetupFee: true },
      });

      // ✅ 8. Return response
      return {
        success: true,
        message: 'Subscription created successfully.',
        subscriptionId: subscription.id,
        customerId: customer.id,
        clientSecret,
        stripeStatus: subscription.status,
      };
    } catch (error) {
      console.error('❌ Subscription creation failed:', error);
      throw new InternalServerErrorException(error.message);
    }
  }
}
