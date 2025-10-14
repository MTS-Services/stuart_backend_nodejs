import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { UserStatus, SubscriptionPlan, SubscriptionStatus } from '@prisma/client';
import Stripe from 'stripe';
import { EmailService } from '../email/email.service';

@Injectable()
export class PaymentService {
  private stripe: Stripe | null;

  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
  ) {
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    const enableMockPayments = process.env.MOCK_PAYMENTS === 'true' || process.env.NODE_ENV === 'development';
    
    if (!stripeKey || enableMockPayments) {
      console.log('⚠️ Payment service running in mock mode.');
      console.log('💡 Set MOCK_PAYMENTS=false in .env to use real Stripe payments');
      this.stripe = null;
    } else {
      try {
        this.stripe = new Stripe(stripeKey, {
          apiVersion: '2025-09-30.clover',
        });
        console.log('💳 Stripe payment service initialized');
      } catch (error) {
        console.log('⚠️ Stripe initialization failed, falling back to mock mode');
        this.stripe = null;
      }
    }
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

    // Mock mode - if Stripe is not properly configured
    if (!this.stripe) {
      console.log('💳 Mock Payment: Creating setup fee payment for user:', user.email);
      
      const mockPaymentIntentId = 'pi_mock_' + Date.now();
      
      // Create payment record in database
      const payment = await this.prisma.payment.create({
        data: {
          userId,
          amount: 69.00,
          currency: 'USD',
          type: 'setup_fee',
          status: 'pending',
          stripePaymentIntentId: mockPaymentIntentId,
        },
      });

      return {
        message: 'Mock setup fee payment intent created',
        payment,
        clientSecret: 'pi_mock_client_secret_' + Date.now(),
        paymentIntentId: mockPaymentIntentId,
        mockMode: true,
        instructions: 'This is a mock payment. Use /payment/confirm-setup-fee to simulate payment completion.'
      };
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

  async paySetupFeeByEmail(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: email },
    });

    if (!user) {
      throw new HttpException('User not found with this email', HttpStatus.NOT_FOUND);
    }

    if (user.paidSetupFee) {
      throw new HttpException('Setup fee already paid', HttpStatus.BAD_REQUEST);
    }

    // Use the existing paySetupFee method
    return this.paySetupFee(user.id);
  }

  async confirmSetupFeePayment(paymentIntentId: string) {
    try {
      // Handle mock payments
      if (paymentIntentId.startsWith('pi_mock_')) {
        console.log('💳 Mock Payment: Confirming setup fee payment:', paymentIntentId);
        
        const payment = await this.prisma.payment.findFirst({
          where: { stripePaymentIntentId: paymentIntentId }
        });

        if (!payment) {
          throw new HttpException('Payment not found', HttpStatus.NOT_FOUND);
        }

        // Get user info
        const user = await this.prisma.user.findUnique({
          where: { id: payment.userId }
        });

        // Update payment status to completed
        const updatedPayment = await this.prisma.payment.update({
          where: { id: payment.id },
          data: { status: 'completed' }
        });

        // Update user's payment status
        await this.prisma.user.update({
          where: { id: payment.userId },
          data: { 
            paidSetupFee: true,
            status: 'ACTIVE'
          }
        });

        console.log('✅ Mock Payment Completed for user:', user?.email);

        // Create notification for admin about payment completion
        await this.prisma.notification.create({
          data: {
            adminId: 1, // Default admin ID
            type: 'payment_completed',
            title: 'Setup Fee Payment Completed',
            message: `${user?.name || 'User'} (${user?.email}) completed setup fee payment ($69)`,
            data: {
              userId: payment.userId,
              paymentId: payment.id,
              amount: 69.00,
              mockMode: true,
            },
          },
        });

        return {
          message: 'Mock setup fee payment confirmed successfully',
          payment: updatedPayment,
          mockMode: true
        };
      }

      // Real Stripe payment handling
      if (!this.stripe) {
        throw new HttpException('Payment service not properly configured', HttpStatus.SERVICE_UNAVAILABLE);
      }

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

        // Send order confirmation email
        try {
          const orderId = `QR-${Date.now()}-${payment.userId}`;
          const deliveryETA = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString(); // 7 days from now
          
          await this.emailService.sendOrderConfirmation(
            updatedUser.email,
            updatedUser.name || 'New User',
            orderId,
            deliveryETA,
          );
        } catch (error) {
          console.error('Failed to send order confirmation email:', error);
          // Don't fail the payment confirmation if email fails
        }

        // Create notification for admin about real payment completion
        await this.prisma.notification.create({
          data: {
            adminId: 1, // Default admin ID
            type: 'payment_completed_stripe',
            title: 'Setup Fee Payment Completed (Stripe)',
            message: `${updatedUser.name || 'User'} (${updatedUser.email}) completed setup fee payment via Stripe ($69)`,
            data: {
              userId: updatedUser.id,
              paymentId: updatedPayment.id,
              stripePaymentIntentId: paymentIntentId,
              amount: 69.00,
            },
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

  async getUserPaymentsByEmail(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: email },
    });

    if (!user) {
      throw new HttpException('User not found with this email', HttpStatus.NOT_FOUND);
    }

    return this.getUserPayments(user.id);
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

  async createSubscriptionByEmail(email: string, plan: 'MONTHLY' | 'YEARLY') {
    const user = await this.prisma.user.findUnique({
      where: { email: email },
    });

    if (!user) {
      throw new HttpException('User not found with this email', HttpStatus.NOT_FOUND);
    }

    return this.createSubscription(user.id, plan);
  }

  async getUserSubscriptionByEmail(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: email },
    });

    if (!user) {
      throw new HttpException('User not found with this email', HttpStatus.NOT_FOUND);
    }

    return this.getUserSubscription(user.id);
  }

  async cancelSubscriptionByEmail(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: email },
    });

    if (!user) {
      throw new HttpException('User not found with this email', HttpStatus.NOT_FOUND);
    }

    return this.cancelSubscription(user.id);
  }
}