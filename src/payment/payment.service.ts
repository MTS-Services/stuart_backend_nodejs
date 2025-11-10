// import {
//   Injectable,
//   InternalServerErrorException,
//   BadRequestException,
// } from '@nestjs/common';
// import { CreateSubscriptionDto } from './payment.dto';
// import Stripe from 'stripe';
// import { PrismaService } from '../prisma.service';
// import { EmailService } from '../email/email.service'; // ✅ adjust path as needed

// @Injectable()
// export class PaymentService {
//   private stripe: Stripe;

//   constructor(
//     private readonly prisma: PrismaService,
//     private readonly mailService: EmailService, // ✅ Inject MailService
//   ) {
//     const stripeKey = process.env.STRIPE_SECRET_KEY;
//     if (!stripeKey) {
//       throw new Error('Missing STRIPE_SECRET_KEY in environment variables');
//     }

//     this.stripe = new Stripe(stripeKey, { apiVersion: '2025-09-30.clover' });
//   }

//   /**
//    * Handles one-time setup payment
//    */
//   async createOneTimePayment(
//     email: string,
//     amount: number,
//     paymentMethodId: string,
//   ) {
//     const user = await this.prisma.user.findUnique({ where: { email } });
//     if (!user) throw new BadRequestException('User not found');

//     if (user.paidSetupFee) {
//       return { message: 'One-time payment already completed' };
//     }

//     const paymentIntent = await this.stripe.paymentIntents.create({
//       amount,
//       currency: 'usd',
//       payment_method: paymentMethodId,
//       confirm: true,
//       automatic_payment_methods: {
//         enabled: true,
//         allow_redirects: 'never',
//       },
//     });

//     await this.prisma.payment.create({
//       data: {
//         userId: user.id,
//         amount,
//         stripePaymentIntentId: paymentIntent.id,
//         type: 'ONE_TIME',
//         status: 'COMPLETED',
//       },
//     });

//     await this.prisma.user.update({
//       where: { id: user.id },
//       data: { paidSetupFee: true },
//     });

//     return {
//       success: true,
//       message: 'One-time payment successful',
//       email: user.email,
//       amount,
//       paymentIntentId: paymentIntent.id,
//       status: paymentIntent.status,
//     };
//   }

//   /**
//    * Handles recurring subscription creation (Stripe)
//    */
//   async createSubscription(dto: CreateSubscriptionDto): Promise<any> {
//     const { email, paymentMethodId, priceId } = dto;

//     try {
//       // ✅ 1. Find or create Stripe customer
//       const existing = await this.stripe.customers.list({ email, limit: 1 });
//       const customer =
//         existing.data.length > 0
//           ? existing.data[0]
//           : await this.stripe.customers.create({
//               email,
//               payment_method: paymentMethodId,
//               invoice_settings: { default_payment_method: paymentMethodId },
//             });

//       // ✅ 2. Attach payment method
//       await this.stripe.paymentMethods.attach(paymentMethodId, {
//         customer: customer.id,
//       });

//       // ✅ 3. Create subscription
//       const subscription = await this.stripe.subscriptions.create({
//         customer: customer.id,
//         items: [{ price: priceId }],
//         expand: ['latest_invoice.payment_intent'],
//       });

//       const invoice = subscription.latest_invoice as Stripe.Invoice & {
//         payment_intent?: Stripe.PaymentIntent | string;
//       };

//       let clientSecret: string | null = null;
//       if (
//         invoice &&
//         invoice.payment_intent &&
//         typeof invoice.payment_intent !== 'string'
//       ) {
//         clientSecret = invoice.payment_intent.client_secret ?? null;
//       }

//       // ✅ 4. Find local user
//       const user = await this.prisma.user.findUnique({ where: { email } });
//       if (!user)
//         throw new InternalServerErrorException('User not found in local DB.');

//       // ✅ 5. Save subscription in DB
//       const plan = 'MONTHLY';
//       const status = 'ACTIVE';
//       const amount = 13.0;

//       await this.prisma.subscription.upsert({
//         where: { userId: user.id },
//         update: {
//           plan,
//           status,
//           amount,
//           currency: 'USD',
//           stripeCustomerId: customer.id,
//           stripeSubscriptionId: subscription.id,
//           startDate: new Date(),
//           endDate: null,
//         },
//         create: {
//           userId: user.id,
//           plan,
//           status,
//           amount,
//           currency: 'USD',
//           stripeCustomerId: customer.id,
//           stripeSubscriptionId: subscription.id,
//           startDate: new Date(),
//         },
//       });

//       // ✅ 6. Mark user as paid
//       await this.prisma.user.update({
//         where: { id: user.id },
//         data: { paidSetupFee: true },
//       });

//       // ✅ 7. Send confirmation email
//       try {
//         const deliveryETA = new Date();
//         deliveryETA.setDate(deliveryETA.getDate() + 5);

//         await this.mailService.sendOrderConfirmation(
//           user.email,
//           subscription.id,
//           deliveryETA.toDateString(),
//           deliveryETA.toDateString(),
//         );
//       } catch (emailError) {
//         console.error('⚠️ Email sending failed:', emailError);
//       }

//       // ✅ 8. Return response
//       return {
//         success: true,
//         message: 'Subscription created successfully.',
//         subscriptionId: subscription.id,
//         customerId: customer.id,
//         plan,
//         status,
//         amount,
//         clientSecret,
//         stripeStatus: subscription.status,
//       };
//     } catch (error: any) {
//       console.error('❌ Subscription creation failed:', error);

//       if (error instanceof Stripe.errors.StripeError) {
//         throw new BadRequestException(error.message);
//       }

//       throw new InternalServerErrorException(error.message || 'Server error');
//     }
//   }
// }




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
   * Helper method to safely attach payment method to customer
   * Handles cases where payment method was previously detached
   */
  private async attachPaymentMethodSafely(
    paymentMethodId: string, 
    customerId: string
  ): Promise<{ attached: boolean; reason?: string }> {
    try {
      await this.stripe.paymentMethods.attach(paymentMethodId, {
        customer: customerId,
      });
      return { attached: true };
    } catch (error: any) {
      if (error.code === 'resource_already_exists') {
        return { attached: true, reason: 'already_attached' };
      } else if (error.code === 'payment_method_not_available_for_reuse') {
        return { attached: false, reason: 'detached_payment_method' };
      } else {
        throw error;
      }
    }
  }

  /**
   * Helper method to set default payment method for customer
   * Ensures customer has a default payment method set
   */
  private async setDefaultPaymentMethod(
    customerId: string,
    paymentMethodId: string
  ): Promise<void> {
    try {
      await this.stripe.customers.update(customerId, {
        invoice_settings: {
          default_payment_method: paymentMethodId,
        },
      });
    } catch (error: any) {
      console.log('Warning: Could not set default payment method:', error.message);
      // Don't throw - this is not critical for payment processing
    }
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

  try {
    // ✅ Find or create Stripe customer for this user
    const existing = await this.stripe.customers.list({ email, limit: 1 });
    const customer = existing.data.length > 0
      ? existing.data[0]
      : await this.stripe.customers.create({ email });

    // ✅ Handle payment method attachment with error handling for detached methods
    const attachResult = await this.attachPaymentMethodSafely(paymentMethodId, customer.id);
    
    if (!attachResult.attached && attachResult.reason === 'detached_payment_method') {
      // Payment method was detached, create PaymentIntent without attaching
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

      return {
        success: true,
        message: 'One-time payment successful (reused payment method)',
        email: user.email,
        amount,
        paymentIntentId: paymentIntent.id,
        status: paymentIntent.status,
      };
    }

    // ✅ Set as default payment method for future use
    await this.setDefaultPaymentMethod(customer.id, paymentMethodId);

    // ✅ Create Stripe PaymentIntent with customer
    const paymentIntent = await this.stripe.paymentIntents.create({
      amount,
      currency: 'usd',
      payment_method: paymentMethodId,
      customer: customer.id,
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
  } catch (error: any) {
    console.error('❌ One-time payment failed:', error);
    
    if (error instanceof Stripe.errors.StripeError) {
      throw new BadRequestException(error.message);
    }
    
    throw new InternalServerErrorException(error.message || 'Payment failed');
  }
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
          });

    // ✅ 2. Handle payment method attachment with better error handling
    const attachResult = await this.attachPaymentMethodSafely(paymentMethodId, customer.id);
    
    if (!attachResult.attached && attachResult.reason === 'detached_payment_method') {
      // For subscriptions with detached payment methods, create subscription with explicit payment method
      console.log('Payment method was detached, creating subscription with explicit payment method');
      
      // Create subscription with explicit payment method and default settings
      const subscription = await this.stripe.subscriptions.create({
        customer: customer.id,
        items: [{ price: priceId }],
        default_payment_method: paymentMethodId,
        payment_behavior: 'default_incomplete',
        payment_settings: {
          payment_method_types: ['card'],
          save_default_payment_method: 'on_subscription',
        },
        expand: ['latest_invoice.payment_intent'],
      });

      // Extract client secret for frontend
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

      // Save subscription in database
      const user = await this.prisma.user.findUnique({
        where: { email },
      });

      if (!user)
        throw new InternalServerErrorException('User not found in local DB.');

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

      await this.prisma.user.update({
        where: { id: user.id },
        data: { paidSetupFee: true },
      });

      return {
        success: true,
        message: 'Subscription created successfully (reused payment method).',
        subscriptionId: subscription.id,
        customerId: customer.id,
        plan,
        status,
        amount,
        clientSecret,
        stripeStatus: subscription.status,
        requiresAction: subscription.status === 'incomplete',
      };
    }

    // ✅ 3. Set as default payment method for customer
    await this.setDefaultPaymentMethod(customer.id, paymentMethodId);

    // ✅ 4. Create Stripe subscription with proper default payment method
    const subscription = await this.stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price: priceId }],
      default_payment_method: paymentMethodId,
      expand: ['latest_invoice.payment_intent'],
    });

    // ✅ 5. Extract client secret for frontend
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

    // ✅ 6. Find local user
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user)
      throw new InternalServerErrorException('User not found in local DB.');

    // ✅ 7. Upsert subscription record
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

    // ✅ 8. Update user paidSetupFee
    await this.prisma.user.update({
      where: { id: user.id },
      data: { paidSetupFee: true },
    });

    // ✅ 9. Return full response
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

  /**
   * Helper method to ensure customer has a valid default payment method
   * Can be called when subscription payments fail due to missing payment method
   */
  async ensureCustomerHasDefaultPaymentMethod(customerId: string): Promise<boolean> {
    try {
      // Get customer details
      const customer = await this.stripe.customers.retrieve(customerId);
      
      if (!customer || customer.deleted) {
        console.log('Customer not found or deleted');
        return false;
      }

      // Check if customer has a default payment method
      if ((customer as Stripe.Customer).invoice_settings?.default_payment_method) {
        console.log('Customer already has default payment method');
        return true;
      }

      // Get attached payment methods
      const paymentMethods = await this.stripe.paymentMethods.list({
        customer: customerId,
        type: 'card',
      });

      if (paymentMethods.data.length === 0) {
        console.log('No payment methods attached to customer');
        return false;
      }

      // Set the first available payment method as default
      const firstPaymentMethod = paymentMethods.data[0];
      await this.setDefaultPaymentMethod(customerId, firstPaymentMethod.id);
      
      console.log(`Set payment method ${firstPaymentMethod.id} as default for customer ${customerId}`);
      return true;
    } catch (error: any) {
      console.error('Failed to ensure default payment method:', error.message);
      return false;
    }
  }
}