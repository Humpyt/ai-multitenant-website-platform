'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { TenantGrid } from '@/components/dashboard/TenantGrid';
import { Tenant } from '@/components/dashboard/TenantCard';
import { PaymentCard } from '@/components/dashboard/PaymentCard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

export default function DashboardPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const fetchTenants = async () => {
    try {
      const response = await fetch('/api/tenants');
      const data = await response.json();

      if (data.success) {
        setTenants(data.tenants);
      } else {
        console.error('Failed to fetch tenants:', data.error);
      }
    } catch (error) {
      console.error('Error fetching tenants:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTenants();
  }, []);

  const handleRefresh = () => {
    fetchTenants();
  };

  const handleEdit = (tenantId: string) => {
    router.push(`/tenants/${tenantId}/edit`);
  };

  const handleView = (tenantId: string) => {
    router.push(`/tenants/${tenantId}/preview`);
  };

  const handleRegenerate = async (tenantId: string) => {
    try {
      const response = await fetch(`/api/tenants/${tenantId}/website`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (data.success) {
        // Refresh the tenant list to show updated status
        fetchTenants();
      } else {
        console.error('Failed to regenerate website:', data.error);
        // You might want to show a toast notification here
      }
    } catch (error) {
      console.error('Error regenerating website:', error);
    }
  };

  const handleCreateNew = () => {
    router.push('/onboarding');
  };

  if (isLoading && tenants.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center space-y-2">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back! Manage your websites and subscriptions.
        </p>
      </div>

      <Tabs defaultValue="websites" className="space-y-6">
        <TabsList>
          <TabsTrigger value="websites">My Websites</TabsTrigger>
          <TabsTrigger value="billing">Billing & Subscription</TabsTrigger>
        </TabsList>

        <TabsContent value="websites">
          <TenantGrid
            tenants={tenants}
            onRefresh={handleRefresh}
            onEdit={handleEdit}
            onView={handleView}
            onRegenerate={handleRegenerate}
            onCreateNew={handleCreateNew}
            isLoading={isLoading}
          />
        </TabsContent>

        <TabsContent value="billing">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {tenants.slice(0, 2).map((tenant) => (
              <PaymentCard
                key={tenant.id}
                tenantId={tenant.id}
                tenantName={tenant.businessName}
                tenantStatus={tenant.status}
                customerEmail="user@example.com" // You'd get this from auth session
                customerName="User Name" // You'd get this from auth session
                isSubscribed={tenant.subscriptionStatus === 'active'}
                onPaymentSuccess={handleRefresh}
              />
            ))}

            {tenants.length === 0 && (
              <div className="col-span-full text-center py-12">
                <p className="text-muted-foreground">
                  Create your first website to manage subscriptions
                </p>
                <Button onClick={handleCreateNew} className="mt-4">
                  Create Website
                </Button>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}