import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { flutterwaveClient } from '@/lib/flutterwave/client';

export async function POST(request: NextRequest) {
  try {
    // Get user session
    const session = await getServerSession();

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { tenantId, tenantName, customerEmail, customerName, customerPhone } = body;

    // Validate required fields
    if (!tenantId || !tenantName || !customerEmail || !customerName) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Create payment request
    const paymentRequest = flutterwaveClient.createTenantSubscriptionPayment(
      tenantId,
      tenantName,
      customerEmail,
      customerName,
      customerPhone
    );

    // Initialize payment with Flutterwave
    const paymentResponse = await flutterwaveClient.initializePayment(paymentRequest);

    if (paymentResponse.success && paymentResponse.data) {
      return NextResponse.json({
        success: true,
        paymentUrl: paymentResponse.data.link,
        transactionReference: paymentResponse.data.tx_ref,
        message: 'Payment initialized successfully',
      });
    } else {
      return NextResponse.json(
        {
          error: paymentResponse.error || 'Failed to initialize payment',
          message: paymentResponse.message,
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Payment initialization error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET endpoint to check payment status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tx_ref = searchParams.get('tx_ref');

    if (!tx_ref) {
      return NextResponse.json(
        { error: 'Transaction reference is required' },
        { status: 400 }
      );
    }

    // Verify transaction with Flutterwave
    const verification = await flutterwaveClient.verifyTransaction(tx_ref);

    if (verification.success && verification.data) {
      return NextResponse.json({
        success: true,
        transaction: verification.data,
        message: 'Transaction verified successfully',
      });
    } else {
      return NextResponse.json(
        {
          error: verification.error || 'Transaction verification failed',
        },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('Transaction verification error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}