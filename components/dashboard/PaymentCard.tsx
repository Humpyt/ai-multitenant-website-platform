'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import {
  CreditCard,
  CheckCircle,
  AlertCircle,
  Clock,
  Zap,
  Globe,
  Shield,
  Smartphone
} from 'lucide-react';

interface PaymentCardProps {
  tenantId: string;
  tenantName: string;
  tenantStatus: string;
  customerEmail: string;
  customerName: string;
  customerPhone?: string;
  isSubscribed?: boolean;
  subscriptionExpiry?: string;
  onPaymentSuccess?: () => void;
}

export function PaymentCard({
  tenantId,
  tenantName,
  tenantStatus,
  customerEmail,
  customerName,
  customerPhone,
  isSubscribed = false,
  subscriptionExpiry,
  onPaymentSuccess
}: PaymentCardProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');

  const handlePayment = async () => {
    setIsProcessing(true);
    setError('');

    try {
      // Create payment request
      const response = await fetch('/api/payments/initialize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tenantId,
          tenantName,
          customerEmail,
          customerName,
          customerPhone,
        }),
      });

      const data = await response.json();

      if (data.success && data.paymentUrl) {
        // Redirect to Flutterwave payment page
        window.location.href = data.paymentUrl;
      } else {
        setError(data.error || 'Failed to initialize payment');
      }
    } catch (error) {
      setError('An error occurred while processing your request');
      console.error('Payment initialization error:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusBadge = () => {
    if (isSubscribed) {
      return (
        <Badge className="bg-green-500 text-white">
          <CheckCircle className="h-3 w-3 mr-1" />
          Active
        </Badge>
      );
    }

    switch (tenantStatus) {
      case 'pending':
        return (
          <Badge variant="secondary">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
      case 'suspended':
        return (
          <Badge variant="destructive">
            <AlertCircle className="h-3 w-3 mr-1" />
            Suspended
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">
            <AlertCircle className="h-3 w-3 mr-1" />
            Inactive
          </Badge>
        );
    }
  };

  const getSubscriptionStatusText = () => {
    if (isSubscribed) {
      if (subscriptionExpiry) {
        const expiryDate = new Date(subscriptionExpiry);
        return `Active until ${expiryDate.toLocaleDateString()}`;
      }
      return 'Active subscription';
    }

    return 'Subscription required to keep your website online';
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Subscription & Billing
            </CardTitle>
            <CardDescription>
              Manage your website hosting subscription
            </CardDescription>
          </div>
          {getStatusBadge()}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Current Status */}
        <div className="space-y-2">
          <h4 className="font-medium">Current Status</h4>
          <p className="text-sm text-muted-foreground">
            {getSubscriptionStatusText()}
          </p>
        </div>

        <Separator />

        {/* Pricing Information */}
        <div className="space-y-4">
          <h4 className="font-medium">Website Hosting Plan</h4>

          <div className="rounded-lg border p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="font-medium">Monthly Subscription</span>
              <span className="text-2xl font-bold">$29.99</span>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>Unlimited website updates</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>AI-powered website generation</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>Custom domain hosting</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>SSL certificate included</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>24/7 website monitoring</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>Priority customer support</span>
              </div>
            </div>
          </div>
        </div>

        <Separator />

        {/* Payment Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center gap-2 text-sm">
            <Shield className="h-4 w-4 text-green-500" />
            <span>Secure Payment</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Globe className="h-4 w-4 text-blue-500" />
            <span>Global Coverage</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Smartphone className="h-4 w-4 text-purple-500" />
            <span>Mobile Payment</span>
          </div>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {isSubscribed && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              Your subscription is active! Your website will remain online as long as your subscription is maintained.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>

      <CardFooter>
        {!isSubscribed && (
          <Button
            onClick={handlePayment}
            disabled={isProcessing}
            className="w-full"
            size="lg"
          >
            {isProcessing ? (
              <>
                <Clock className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Zap className="h-4 w-4 mr-2" />
                Activate Subscription - $29.99/month
              </>
            )}
          </Button>
        )}

        {isSubscribed && (
          <div className="w-full space-y-2">
            <Button variant="outline" className="w-full">
              Manage Subscription
            </Button>
            <Button variant="ghost" className="w-full" size="sm">
              View Billing History
            </Button>
          </div>
        )}
      </CardFooter>
    </Card>
  );
}