'use client';

import { useState, useEffect } from 'react';
import { TenantCard } from './TenantCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, Globe, RefreshCw } from 'lucide-react';
import { Tenant } from './TenantCard';

interface TenantGridProps {
  tenants: Tenant[];
  onRefresh: () => void;
  onEdit: (tenantId: string) => void;
  onView: (tenantId: string) => void;
  onRegenerate: (tenantId: string) => void;
  onCreateNew: () => void;
  isLoading?: boolean;
}

export function TenantGrid({
  tenants,
  onRefresh,
  onEdit,
  onView,
  onRegenerate,
  onCreateNew,
  isLoading = false
}: TenantGridProps) {
  const [autoRefresh, setAutoRefresh] = useState(false);

  // Auto-refresh for generating websites
  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => {
        const hasGenerating = tenants.some(t => t.website?.status === 'generating');
        if (hasGenerating) {
          onRefresh();
        }
      }, 5000); // Refresh every 5 seconds

      return () => clearInterval(interval);
    }
  }, [autoRefresh, tenants, onRefresh]);

  const hasGenerating = tenants.some(t => t.website?.status === 'generating');

  useEffect(() => {
    setAutoRefresh(hasGenerating);
  }, [hasGenerating]);

  const getStatusCounts = () => {
    const counts = {
      total: tenants.length,
      active: tenants.filter(t => t.status === 'active').length,
      pending: tenants.filter(t => t.status === 'pending').length,
      generating: tenants.filter(t => t.website?.status === 'generating').length,
      completed: tenants.filter(t => t.website?.status === 'completed').length,
      failed: tenants.filter(t => t.website?.status === 'failed').length,
    };
    return counts;
  };

  const statusCounts = getStatusCounts();

  if (isLoading && tenants.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center space-y-2">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="text-muted-foreground">Loading your websites...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status Overview */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Globe className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Total Sites</p>
                <p className="text-2xl font-bold">{statusCounts.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 rounded-full bg-green-500" />
              <div>
                <p className="text-sm font-medium">Active</p>
                <p className="text-2xl font-bold">{statusCounts.active}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 rounded-full bg-yellow-500" />
              <div>
                <p className="text-sm font-medium">Generating</p>
                <p className="text-2xl font-bold">{statusCounts.generating}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 rounded-full bg-blue-500" />
              <div>
                <p className="text-sm font-medium">Completed</p>
                <p className="text-2xl font-bold">{statusCounts.completed}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 rounded-full bg-red-500" />
              <div>
                <p className="text-sm font-medium">Failed</p>
                <p className="text-2xl font-bold">{statusCounts.failed}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Header Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Your Websites</h2>
          <p className="text-muted-foreground">
            Manage and monitor your AI-generated websites
          </p>
        </div>
        <div className="flex items-center space-x-2">
          {hasGenerating && (
            <Badge variant="secondary" className="flex items-center space-x-1">
              <Loader2 className="h-3 w-3 animate-spin" />
              <span>Auto-refreshing</span>
            </Badge>
          )}
          <Button
            variant="outline"
            onClick={onRefresh}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={onCreateNew}>
            <Plus className="h-4 w-4 mr-2" />
            New Website
          </Button>
        </div>
      </div>

      {/* Tenant Grid */}
      {tenants.length === 0 ? (
        <Card>
          <CardHeader className="text-center">
            <Globe className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <CardTitle>No websites yet</CardTitle>
            <CardDescription>
              Get started by creating your first AI-powered website
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={onCreateNew} size="lg">
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Website
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tenants.map((tenant) => (
            <TenantCard
              key={tenant.id}
              tenant={tenant}
              onRefresh={onRefresh}
              onEdit={onEdit}
              onView={onView}
              onRegenerate={onRegenerate}
            />
          ))}
        </div>
      )}
    </div>
  );
}