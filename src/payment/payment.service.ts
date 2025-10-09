import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { UserStatus, SubscriptionPlan, SubscriptionStatus } from '@prisma/client';
import Stripe from 'stripe';

@Injectable()
export class PaymentService {
  private stripe: Stripe;

  constructor(private prisma: PrismaService) {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2025-09-30.clover',
    });
  }

  async paySetupFee(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }

    if (user.paidSetupFee) {
      throw new HttpException('Setup fee already paid', HttpStatus.BAD_REQUEST);
    }

    try {
      // Create Stripe customer if doesn't exist
      let stripeCustomerId = user.stripeCustomerId;
      if (!stripeCustomerId) {
        const customer = await this.stripe.customers.create({
          email: user.email,
          name: user.name || undefined,
          metadata: {
            userId: userId.toString(),
          },
        });
        
        // Update user with Stripe customer ID
        await this.prisma.user.update({
          where: { id: userId },
          data: { stripeCustomerId: customer.id },
        });
        
        stripeCustomerId = customer.id;
      }

      // Create payment intent for setup fee
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: 6900, // $69.00 in cents
        currency: 'usd',
        customer: stripeCustomerId,
        metadata: {
          userId: userId.toString(),
          type: 'setup_fee',
        },
        description: 'QR Card Dating App - Setup Fee',
        automatic_payment_methods: {
          enabled: true,
        },
      });

      // Create payment record in database
      const payment = await this.prisma.payment.create({
        data: {
          userId,
          amount: 69.00,
          currency: 'USD',
          type: 'setup_fee',
          status: 'pending',
          stripePaymentIntentId: paymentIntent.id,
        },
      });

      return {
        message: 'Setup fee payment intent created',
        payment,
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
      };
    } catch (error) {
      throw new HttpException(
        `Payment processing failed: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async confirmSetupFeePayment(paymentIntentId: string) {
    try {
      const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);
      
      if (paymentIntent.status === 'succeeded') {
        // Find the payment in our database
        const payment = await this.prisma.payment.findFirst({
          where: { stripePaymentIntentId: paymentIntentId },
        });

        if (!payment) {
          throw new HttpException('Payment not found', HttpStatus.NOT_FOUND);
        }

        // Update payment and user status
        const updatedPayment = await this.prisma.payment.update({
          where: { id: payment.id },
          data: { status: 'completed' },
        });

        const updatedUser = await this.prisma.user.update({
          where: { id: payment.userId },
          data: {
            paidSetupFee: true,
            status: UserStatus.PAID_SETUP,
          },
        });

        return {
          message: 'Setup fee payment confirmed',
          payment: updatedPayment,
          user: {
            id: updatedUser.id,
            email: updatedUser.email,
            name: updatedUser.name,
            status: updatedUser.status,
            paidSetupFee: updatedUser.paidSetupFee,
          },
        };
      } else {
        throw new HttpException('Payment not completed', HttpStatus.BAD_REQUEST);
      }
    } catch (error) {
      throw new HttpException(
        `Payment confirmation failed: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async createSubscription(userId: number, plan: SubscriptionPlan) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { subscription: true },
    });

    if (!user) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }

    if (!user.paidSetupFee) {
      throw new HttpException('Setup fee must be paid first', HttpStatus.BAD_REQUEST);
    }

    if (user.subscription && user.subscription.status === SubscriptionStatus.ACTIVE) {
      throw new HttpException('User already has active subscription', HttpStatus.BAD_REQUEST);
    }

    const amount = plan === SubscriptionPlan.MONTHLY ? 13.00 : 120.00;
    const startDate = new Date();
    const endDate = new Date();
    
    if (plan === SubscriptionPlan.MONTHLY) {
      endDate.setMonth(endDate.getMonth() + 1);
    } else {
      endDate.setFullYear(endDate.getFullYear() + 1);
    }

    // Create or update subscription
    const subscription = await this.prisma.subscription.upsert({
      where: { userId },
      update: {
        plan,
        status: SubscriptionStatus.ACTIVE,
        amount,
        startDate,
        endDate,
      },
      create: {
        userId,
        plan,
        status: SubscriptionStatus.ACTIVE,
        amount,
        startDate,
        endDate,
      },
    });

    // Create payment record
    const payment = await this.prisma.payment.create({
      data: {
        userId,
        subscriptionId: subscription.id,
        amount,
        currency: 'USD',
        type: 'subscription',
        status: 'completed',
      },
    });

    return {
      message: `${plan} subscription created successfully`,
      subscription,
      payment,
    };
  }

  async getUserPayments(userId: number) {
    const payments = await this.prisma.payment.findMany({
      where: { userId },
      include: { subscription: true },
      orderBy: { createdAt: 'desc' },
    });

    return payments;
  }

  async getUserSubscription(userId: number) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { userId },
      include: { payments: true },
    });

    return subscription;
  }

  async cancelSubscription(userId: number) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { userId },
    });

    if (!subscription) {
      throw new HttpException('No subscription found', HttpStatus.NOT_FOUND);
    }

    if (subscription.status !== SubscriptionStatus.ACTIVE) {
      throw new HttpException('Subscription is not active', HttpStatus.BAD_REQUEST);
    }

    const updatedSubscription = await this.prisma.subscription.update({
      where: { userId },
      data: { status: SubscriptionStatus.CANCELLED },
    });

    return {
      message: 'Subscription cancelled successfully',
      subscription: updatedSubscription,
    };
  }
}