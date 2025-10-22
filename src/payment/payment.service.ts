import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { UserStatus } from '@prisma/client';
import Stripe from 'stripe';
import { EmailService } from '../email/email.service';

// --- Define the minimal necessary enums/types from Prisma (assuming SubscriptionPlan/SubscriptionStatus are no longer needed) ---
// Note: If UserStatus is still needed in this file, ensure it's imported or defined if not using @prisma/client directly.

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
      this.stripe = null;
    } else {
      try {
        this.stripe = new Stripe(stripeKey, {
          apiVersion: '2025-09-30.clover',
        });
        // Initialization logging remains the same
      } catch (error) {
        console.log('⚠️ Stripe initialization failed, falling back to mock mode');
        this.stripe = null;
      }
    }
  }

  private validatePaymentMethod(paymentMethodId: string): void {
    if (!this.stripe) return; // Skip validation in mock mode
    
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    const isLiveMode = stripeKey?.startsWith('sk_live_');
    
    // Check for test payment methods
    const testPaymentMethods = ['pm_card_visa', 'pm_card_mastercard', 'pm_card_amex', 'pm_card_discover'];
    const isTestPaymentMethod = testPaymentMethods.includes(paymentMethodId);
    
    if (isLiveMode && isTestPaymentMethod) {
      throw new HttpException(
        `Cannot use test payment method '${paymentMethodId}' in live mode.`,
        HttpStatus.BAD_REQUEST
      );
    }
  }

// -----------------------------------------------------------
// CORE FUNCTIONS (Retained/Modified)
// -----------------------------------------------------------

  async processSimplePayment(email: string, paymentMethodId: string, priceId: string) {
    try {
      // Find or create user by email
      let user = await this.prisma.user.findUnique({
        where: { email },
      });

      if (!user) {
        // Create new user if doesn't exist
        user = await this.prisma.user.create({
          data: {
            email,
            name: email.split('@')[0],
            status: UserStatus.WAITLIST,
            paidSetupFee: false,
          },
        });
      }
      
      // Mock mode - if Stripe is not properly configured
      if (!this.stripe) {
        console.log('💳 Mock Simple Payment for:', email, 'Price ID:', priceId);
        
        // Create mock payment record
        const payment = await this.prisma.payment.create({
          data: {
            userId: user.id,
            amount: 69.00, // Default amount for mock
            currency: 'usd',
            status: 'completed',
            stripePaymentIntentId: `mock_pi_${Date.now()}`,
            type: 'setup_fee',
          },
        });

        // Update user status
        await this.prisma.user.update({
          where: { id: user.id },
          data: {
            paidSetupFee: true,
            status: UserStatus.PAID_SETUP,
          },
        });
      
        // Send mock confirmation via order confirmation email
        await this.emailService.sendOrderConfirmation(
          user.email,
          user.name || 'User',
          payment.stripePaymentIntentId || `mock_order_${payment.id}`,
          'Mock payment - no delivery required'
        );

        return {
          success: true,
          mockMode: true,
          paymentId: payment.id,
          userId: user.id,
          email: user.email,
          amount: payment.amount.toString(),
          currency: payment.currency,
          status: payment.status,
          message: 'Mock simple payment processed successfully'
        };
      }

      // Real Stripe processing logic (Unchanged)
      let stripeCustomerId = user.stripeCustomerId;

      // Validate payment method before proceeding
      this.validatePaymentMethod(paymentMethodId);

      // Create Stripe customer if doesn't exist
      if (!stripeCustomerId) {
        const customer = await this.stripe.customers.create({
          email: user.email,
          name: user.name || undefined,
          metadata: {
            userId: user.id.toString(),
          },
        });
        
        await this.prisma.user.update({
          where: { id: user.id },
          data: { stripeCustomerId: customer.id },
        });
        
        stripeCustomerId = customer.id;
      }

      // Attach payment method to customer
      await this.stripe.paymentMethods.attach(paymentMethodId, {
        customer: stripeCustomerId,
      });

      // Get price details from Stripe
      const price = await this.stripe.prices.retrieve(priceId);
      const amount = price.unit_amount || 6900;

      // Create payment intent with the payment method
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: amount,
        currency: price.currency || 'usd',
        customer: stripeCustomerId,
        payment_method: paymentMethodId,
        confirmation_method: 'manual',
        confirm: true,
        metadata: {
          userId: user.id.toString(),
          type: 'simple_payment',
          priceId: priceId,
        },
      });

      // Create payment record
      const payment = await this.prisma.payment.create({
        data: {
          userId: user.id,
          amount: amount / 100,
          currency: price.currency || 'usd',
          status: paymentIntent.status === 'succeeded' ? 'completed' : 'pending',
          stripePaymentIntentId: paymentIntent.id,
          type: 'setup_fee',
        },
      });

      // If payment succeeded, update user status
      if (paymentIntent.status === 'succeeded') {
        await this.prisma.user.update({
          where: { id: user.id },
          data: {
            paidSetupFee: true,
            status: UserStatus.PAID_SETUP,
          },
        });

        // Send confirmation email
        try {
          const orderId = `QR-${Date.now()}-${user.id}`;
          const deliveryETA = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString();
          
          await this.emailService.sendOrderConfirmation(
            user.email,
            user.name || 'New User',
            orderId,
            deliveryETA,
          );
        } catch (error) {
          console.error('Failed to send order confirmation email:', error);
        }
      }

      return {
        success: paymentIntent.status === 'succeeded',
        mockMode: false,
        paymentId: payment.id,
        userId: user.id,
        email: user.email,
        amount: payment.amount.toString(),
        currency: payment.currency,
        status: payment.status,
        message: paymentIntent.status === 'succeeded' ? 'Payment processed successfully' : 'Payment requires additional action',
        paymentIntent: {
          id: paymentIntent.id,
          status: paymentIntent.status,
          client_secret: paymentIntent.client_secret,
        }
      };

    } catch (error) {
      console.error('Simple payment processing failed:', error);
      throw new HttpException(
        `Payment processing failed: ${error.message}`,
        HttpStatus.BAD_REQUEST
      );
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
        payment_method_types: ['card'],
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
      if (error.type === 'StripeInvalidRequestError') {
        if (error.message.includes('payment method types')) {
          throw new HttpException(
            'Payment method configuration error. Please contact support.',
            HttpStatus.INTERNAL_SERVER_ERROR
          );
        }
      }
      
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
        throw new HttpException(`Payment not completed. Status: ${paymentIntent.status}.`, HttpStatus.BAD_REQUEST);
      }
    } catch (error) {
      throw new HttpException(
        `Payment confirmation failed: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async getUserPayments(userId: number) {
    const payments = await this.prisma.payment.findMany({
      where: { userId },
      // Remove subscription include as subscriptions are removed
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

  // Removed: createSubscription, getUserSubscription, cancelSubscription and all corresponding ByEmail methods

  async simulateSetupFeePaymentCompletion(paymentIntentId: string) {
    try {
      console.log('🧪 DEMO MODE: Simulating payment completion for:', paymentIntentId);
      
      const payment = await this.prisma.payment.findFirst({
        where: { stripePaymentIntentId: paymentIntentId }
      });

      if (!payment) {
        throw new HttpException('Payment not found', HttpStatus.NOT_FOUND);
      }

      if (payment.status === 'completed') {
        throw new HttpException('Payment already completed', HttpStatus.BAD_REQUEST);
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
      const updatedUser = await this.prisma.user.update({
        where: { id: payment.userId },
        data: { 
          paidSetupFee: true,
          status: UserStatus.PAID_SETUP,
        }
      });

      console.log('✅ DEMO Payment Completed for user:', user?.email);

      // Create notification for admin
      await this.prisma.notification.create({
        data: {
          adminId: 1,
          type: 'payment_completed_demo',
          title: 'Setup Fee Payment Completed (Demo)',
          message: `${user?.name || 'User'} (${user?.email}) completed setup fee payment - DEMO MODE ($69)`,
          data: {
            userId: payment.userId,
            paymentId: payment.id,
            amount: 69.00,
            demoMode: true,
          },
        },
      });

      return {
        message: 'Setup fee payment simulated successfully (DEMO MODE)',
        payment: updatedPayment,
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          name: updatedUser.name,
          status: updatedUser.status,
          paidSetupFee: updatedUser.paidSetupFee,
        },
        demoMode: true,
        note: 'This is a simulated payment completion for testing purposes'
      };
    } catch (error) {
      throw new HttpException(
        `Demo payment simulation failed: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  getPaymentMode() {
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    const enableMockPayments = process.env.MOCK_PAYMENTS === 'true' || process.env.NODE_ENV === 'development';
    
    return {
      isMockMode: enableMockPayments,
      isTestMode: stripeKey?.startsWith('sk_test_') || false,
      isLiveMode: stripeKey?.startsWith('sk_live_') || false,
      stripeKeyType: stripeKey?.substring(0, 10) + '...',
      nodeEnv: process.env.NODE_ENV,
      mockPayments: process.env.MOCK_PAYMENTS,
      hasStripeInstance: this.stripe !== null
    };
  }
}