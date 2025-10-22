import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { SimplePaymentDto } from './payment.dto';
import Stripe from 'stripe';

@Injectable()
export class PaymentService {
  private stripe: Stripe;

constructor() {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    throw new Error('Missing STRIPE_SECRET_KEY in environment variables');
  }

  this.stripe = new Stripe(stripeKey); // ✅ no apiVersion needed
}

  /**
   * Process a simple one-time payment.
   */
  async simplePayment(simplePaymentDto: SimplePaymentDto): Promise<any> {
    const { email, paymentMethodId, priceId } = simplePaymentDto;

    try {
      // ✅ Step 1: Create or retrieve a Stripe Customer
      const customer = await this.stripe.customers.create({
        email,
        payment_method: paymentMethodId,
        invoice_settings: {
          default_payment_method: paymentMethodId,
        },
      });

      // ✅ Step 2: Retrieve price info (from Stripe Dashboard)
      const price = await this.stripe.prices.retrieve(priceId);

      if (!price.unit_amount || !price.currency) {
        throw new InternalServerErrorException('Invalid price information.');
      }

      // ✅ Step 3: Create a PaymentIntent
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: price.unit_amount, // in cents
        currency: price.currency,
        customer: customer.id,
        payment_method: paymentMethodId,
        off_session: true,
        confirm: true,
      });

      // ✅ Step 4: Return clean response
      return {
        success: true,
        message: 'Payment processed successfully.',
        transactionId: paymentIntent.id,
        amountProcessed: `${(price.unit_amount / 100).toFixed(2)} ${price.currency.toUpperCase()}`,
        status: paymentIntent.status,
      };
    } catch (error) {
      console.error('Payment processing failed:', error);
      throw new InternalServerErrorException(error.message);
    }
  }
}
