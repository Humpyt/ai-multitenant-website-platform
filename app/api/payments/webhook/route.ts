import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { initializeDatabase, getTenantRepository } from '@/server/database';
import { Tenant, TenantStatus } from '@/server/database/entities';
import {
  flutterwaveClient,
  verifyWebhookSignature,
  parseWebhookPayload,
  WebhookPayload
} from '@/lib/flutterwave/client';

interface ProcessedWebhook {
  id: string;
  tx_ref: string;
  event_type: string;
  processed_at: string;
}

// In-memory store for processed webhooks to prevent duplicates
// In production, you'd want to use Redis or a database table
const processedWebhooks = new Map<string, ProcessedWebhook>();

// Clean up old entries (older than 1 hour)
setInterval(() => {
  const oneHourAgo = Date.now() - 60 * 60 * 1000;
  for (const [key, webhook] of processedWebhooks.entries()) {
    if (new Date(webhook.processed_at).getTime() < oneHourAgo) {
      processedWebhooks.delete(key);
    }
  }
}, 60 * 60 * 1000); // Run every hour

export async function POST(request: NextRequest) {
  try {
    // Get the raw body for signature verification
    const body = await request.text();
    const headersList = headers();

    // Get the signature from headers
    const signature = headersList.get('verif-hash');

    if (!signature) {
      console.error('Webhook received without signature');
      return NextResponse.json(
        { error: 'Missing signature' },
        { status: 401 }
      );
    }

    // Verify the webhook signature
    if (!verifyWebhookSignature(body, signature)) {
      console.error('Invalid webhook signature');
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    // Parse the webhook payload
    const payload = parseWebhookPayload(body);

    if (!payload) {
      console.error('Invalid webhook payload');
      return NextResponse.json(
        { error: 'Invalid payload' },
        { status: 400 }
      );
    }

    // Check if this webhook has already been processed
    const webhookId = `${payload.event}_${payload.data.id}_${payload.data.tx_ref}`;
    if (processedWebhooks.has(webhookId)) {
      console.log(`Webhook already processed: ${webhookId}`);
      return NextResponse.json({ status: 'already_processed' });
    }

    // Ensure database is initialized
    await initializeDatabase();

    // Process the webhook based on the event type
    const result = await processWebhookEvent(payload);

    if (result.success) {
      // Mark this webhook as processed
      processedWebhooks.set(webhookId, {
        id: webhookId,
        tx_ref: payload.data.tx_ref,
        event_type: payload.event,
        processed_at: new Date().toISOString(),
      });

      return NextResponse.json({
        status: 'success',
        message: 'Webhook processed successfully',
        data: result.data,
      });
    } else {
      console.error('Failed to process webhook:', result.error);
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function processWebhookEvent(payload: WebhookPayload): Promise<{
  success: boolean;
  data?: any;
  error?: string;
}> {
  const { event, data } = payload;

  try {
    switch (event) {
      case 'charge.completed':
        return await handleChargeCompleted(data);

      case 'payment.completed':
        return await handlePaymentCompleted(data);

      case 'transfer.completed':
        return await handleTransferCompleted(data);

      case 'subscription.created':
        return await handleSubscriptionCreated(data);

      case 'subscription.completed':
        return await handleSubscriptionCompleted(data);

      case 'subscription.cancelled':
        return await handleSubscriptionCancelled(data);

      default:
        console.log(`Unhandled webhook event: ${event}`);
        return { success: true, data: { event: 'ignored' } };
    }
  } catch (error) {
    console.error(`Error processing webhook event ${event}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

async function handleChargeCompleted(data: any): Promise<{
  success: boolean;
  data?: any;
  error?: string;
}> {
  const tenantRepo = getTenantRepository();

  // Extract tenant information from metadata
  const tenantId = data.meta?.tenant_id;
  const product = data.meta?.product;

  if (!tenantId) {
    console.log('Charge completed without tenant_id in metadata');
    return { success: true, data: { message: 'No tenant_id found' } };
  }

  // Find the tenant
  const tenant = await tenantRepo.findOne({ where: { id: tenantId } });

  if (!tenant) {
    console.error(`Tenant not found: ${tenantId}`);
    return { success: false, error: 'Tenant not found' };
  }

  // Update tenant status based on product type
  if (product === 'website_hosting') {
    await tenantRepo.update(tenantId, {
      status: TenantStatus.ACTIVE,
    });

    console.log(`Tenant ${tenant.name} activated due to successful payment`);

    return {
      success: true,
      data: {
        tenant_id: tenantId,
        tenant_name: tenant.name,
        status: 'activated',
        amount: data.amount,
        currency: data.currency,
      },
    };
  }

  return {
    success: true,
    data: { message: 'Charge processed', product },
  };
}

async function handlePaymentCompleted(data: any): Promise<{
  success: boolean;
  data?: any;
  error?: string;
}> {
  // Similar to charge.completed but for payment events
  return handleChargeCompleted(data);
}

async function handleTransferCompleted(data: any): Promise<{
  success: boolean;
  data?: any;
  error?: string;
}> {
  console.log('Transfer completed:', {
    id: data.id,
    amount: data.amount,
    currency: data.currency,
  });

  return {
    success: true,
    data: { message: 'Transfer processed' },
  };
}

async function handleSubscriptionCreated(data: any): Promise<{
  success: boolean;
  data?: any;
  error?: string;
}> {
  console.log('Subscription created:', {
    id: data.id,
    customer_email: data.customer?.email,
    amount: data.amount,
    plan: data.plan,
  });

  return {
    success: true,
    data: { message: 'Subscription created' },
  };
}

async function handleSubscriptionCompleted(data: any): Promise<{
  success: boolean;
  data?: any;
  error?: string;
}> {
  const tenantRepo = getTenantRepository();

  // Extract tenant information from metadata
  const tenantId = data.meta?.tenant_id;

  if (!tenantId) {
    console.log('Subscription completed without tenant_id in metadata');
    return { success: true, data: { message: 'No tenant_id found' } };
  }

  // Find and update tenant
  const tenant = await tenantRepo.findOne({ where: { id: tenantId } });

  if (!tenant) {
    console.error(`Tenant not found: ${tenantId}`);
    return { success: false, error: 'Tenant not found' };
  }

  await tenantRepo.update(tenantId, {
    status: TenantStatus.ACTIVE,
  });

  console.log(`Tenant ${tenant.name} subscription activated`);

  return {
    success: true,
    data: {
      tenant_id: tenantId,
      tenant_name: tenant.name,
      status: 'subscription_activated',
      subscription_id: data.id,
    },
  };
}

async function handleSubscriptionCancelled(data: any): Promise<{
  success: boolean;
  data?: any;
  error?: string;
}> {
  const tenantRepo = getTenantRepository();

  // Extract tenant information from metadata
  const tenantId = data.meta?.tenant_id;

  if (!tenantId) {
    console.log('Subscription cancelled without tenant_id in metadata');
    return { success: true, data: { message: 'No tenant_id found' } };
  }

  // Find and update tenant
  const tenant = await tenantRepo.findOne({ where: { id: tenantId } });

  if (!tenant) {
    console.error(`Tenant not found: ${tenantId}`);
    return { success: false, error: 'Tenant not found' };
  }

  await tenantRepo.update(tenantId, {
    status: TenantStatus.SUSPENDED,
  });

  console.log(`Tenant ${tenant.name} suspended due to subscription cancellation`);

  return {
    success: true,
    data: {
      tenant_id: tenantId,
      tenant_name: tenant.name,
      status: 'subscription_cancelled',
      subscription_id: data.id,
    },
  };
}

// GET endpoint for testing webhook configuration
export async function GET() {
  return NextResponse.json({
    status: 'webhook_endpoint_active',
    timestamp: new Date().toISOString(),
    message: 'Flutterwave webhook endpoint is active',
  });
}