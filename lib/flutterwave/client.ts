import Flutterwave from 'flutterwave-node-v3';
import crypto from 'crypto';

export interface PaymentRequest {
  amount: number;
  currency: string;
  email: string;
  tx_ref: string;
  customer: {
    email: string;
    name: string;
    phonenumber?: string;
  };
  customizations?: {
    title?: string;
    description?: string;
    logo?: string;
  };
  redirect_url?: string;
  meta?: Record<string, any>;
}

export interface PaymentResponse {
  success: boolean;
  message: string;
  data?: {
    link: string;
    tx_ref: string;
    status: string;
    id: number;
  };
  error?: string;
}

export interface TransactionVerification {
  success: boolean;
  data?: {
    id: number;
    tx_ref: string;
    flw_ref: string;
    amount: number;
    currency: string;
    status: string;
    payment_type: string;
    created_at: string;
    customer: {
      email: string;
      name: string;
    };
    meta?: Record<string, any>;
  };
  error?: string;
}

export interface WebhookPayload {
  event: string;
  data: {
    id: number;
    tx_ref: string;
    flw_ref: string;
    amount: number;
    currency: string;
    status: string;
    payment_type: string;
    created_at: string;
    customer: {
      email: string;
      name: string;
    };
    meta?: Record<string, any>;
  };
}

export class FlutterwaveClient {
  private client: Flutterwave;
  private secretHash: string;

  constructor() {
    const secretKey = process.env.FLUTTERWAVE_SECRET_KEY;
    const secretHash = process.env.FLUTTERWAVE_SECRET_HASH;

    if (!secretKey || !secretHash) {
      throw new Error('Flutterwave credentials not configured');
    }

    this.client = new Flutterwave(secretKey);
    this.secretHash = secretHash;
  }

  /**
   * Initialize a payment transaction
   */
  async initializePayment(paymentData: PaymentRequest): Promise<PaymentResponse> {
    try {
      const response = await this.client.Payment.payment({
        ...paymentData,
        payment_options: 'card, banktransfer, ussd, mpesa, barter, credit, payattitude',
      });

      return {
        success: true,
        message: 'Payment initialized successfully',
        data: {
          link: response.data.link,
          tx_ref: response.data.tx_ref,
          status: response.data.status,
          id: response.data.id,
        },
      };
    } catch (error) {
      console.error('Flutterwave payment initialization error:', error);
      return {
        success: false,
        message: 'Failed to initialize payment',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Verify a transaction using the transaction reference
   */
  async verifyTransaction(tx_ref: string): Promise<TransactionVerification> {
    try {
      const response = await this.client.Payment.verify({ tx_ref });

      return {
        success: true,
        data: {
          id: response.data.id,
          tx_ref: response.data.tx_ref,
          flw_ref: response.data.flw_ref,
          amount: response.data.amount,
          currency: response.data.currency,
          status: response.data.status,
          payment_type: response.data.payment_type,
          created_at: response.data.created_at,
          customer: response.data.customer,
          meta: response.data.meta,
        },
      };
    } catch (error) {
      console.error('Flutterwave transaction verification error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Verification failed',
      };
    }
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(payload: string, signature: string): boolean {
    try {
      const hash = crypto
        .createHmac('sha256', this.secretHash)
        .update(payload)
        .digest('hex');

      return hash === signature;
    } catch (error) {
      console.error('Webhook signature verification error:', error);
      return false;
    }
  }

  /**
   * Parse webhook payload safely
   */
  parseWebhookPayload(body: string): WebhookPayload | null {
    try {
      return JSON.parse(body);
    } catch (error) {
      console.error('Error parsing webhook payload:', error);
      return null;
    }
  }

  /**
   * Create payment request for tenant subscription
   */
  createTenantSubscriptionPayment(
    tenantId: string,
    tenantName: string,
    customerEmail: string,
    customerName: string,
    customerPhone?: string
  ): PaymentRequest {
    const tx_ref = `tenant_${tenantId}_${Date.now()}`;

    return {
      amount: 29.99, // $29.99 monthly subscription
      currency: 'USD',
      email: customerEmail,
      tx_ref,
      customer: {
        email: customerEmail,
        name: customerName,
        phonenumber: customerPhone,
      },
      customizations: {
        title: 'Website Hosting Subscription',
        description: `Monthly subscription for ${tenantName} website hosting`,
      },
      redirect_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/dashboard?payment=success`,
      meta: {
        tenant_id: tenantId,
        product: 'website_hosting',
        subscription_type: 'monthly',
      },
    };
  }

  /**
   * Create payment request for additional features
   */
  createFeaturePayment(
    tenantId: string,
    featureName: string,
    amount: number,
    customerEmail: string,
    customerName: string
  ): PaymentRequest {
    const tx_ref = `feature_${tenantId}_${featureName}_${Date.now()}`;

    return {
      amount,
      currency: 'USD',
      email: customerEmail,
      tx_ref,
      customer: {
        email: customerEmail,
        name: customerName,
      },
      customizations: {
        title: `Add ${featureName}`,
        description: `Add ${featureName} to your website`,
      },
      redirect_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/dashboard?payment=success`,
      meta: {
        tenant_id: tenantId,
        product: 'feature_addon',
        feature: featureName,
      },
    };
  }

  /**
   * Get payment status color based on status
   */
  static getStatusColor(status: string): string {
    switch (status.toLowerCase()) {
      case 'successful':
      case 'success':
        return 'green';
      case 'pending':
      case 'processing':
        return 'yellow';
      case 'failed':
        return 'red';
      case 'cancelled':
      case 'abandoned':
        return 'gray';
      default:
        return 'gray';
    }
  }

  /**
   * Format currency amount
   */
  static formatAmount(amount: number, currency: string = 'USD'): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  }
}

// Singleton instance
export const flutterwaveClient = new FlutterwaveClient();

// Helper functions
export const initializePayment = flutterwaveClient.initializePayment.bind(flutterwaveClient);
export const verifyTransaction = flutterwaveClient.verifyTransaction.bind(flutterwaveClient);
export const verifyWebhookSignature = flutterwaveClient.verifyWebhookSignature.bind(flutterwaveClient);
export const parseWebhookPayload = flutterwaveClient.parseWebhookPayload.bind(flutterwaveClient);