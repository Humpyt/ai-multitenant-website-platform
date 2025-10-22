'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  ExternalLink,
  Eye,
  Edit,
  RefreshCw,
  Settings,
  Globe,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2
} from 'lucide-react';

export interface Tenant {
  id: string;
  name: string;
  subdomain: string;
  status: 'pending' | 'active' | 'suspended' | 'inactive';
  businessName: string;
  businessType: string;
  createdAt: string;
  updatedAt: string;
  subscriptionStatus?: 'active' | 'inactive';
  website?: {
    id: string;
    status: 'generating' | 'completed' | 'failed' | 'updating';
    generatedAt?: string;
    lastUpdated?: string;
    urls?: {
      html: string;
      css: string;
      js: string;
    };
  };
}

interface TenantCardProps {
  tenant: Tenant;
  onRefresh: () => void;
  onEdit: (tenantId: string) => void;
  onView: (tenantId: string) => void;
  onRegenerate: (tenantId: string) => void;
}

export function TenantCard({ tenant, onRefresh, onEdit, onView, onRegenerate }: TenantCardProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [progress, setProgress] = useState(0);

  // Simulate progress for generating websites
  useEffect(() => {
    if (tenant.website?.status === 'generating') {
      const interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) {
            clearInterval(interval);
            return 90;
          }
          return prev + Math.random() * 10;
        });
      }, 2000);

      return () => clearInterval(interval);
    } else if (tenant.website?.status === 'completed') {
      setProgress(100);
    } else {
      setProgress(0);
    }
  }, [tenant.website?.status]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await onRefresh();
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
      case 'completed':
        return 'bg-green-500';
      case 'pending':
      case 'generating':
        return 'bg-yellow-500';
      case 'suspended':
      case 'failed':
        return 'bg-red-500';
      case 'inactive':
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'generating':
        return <Loader2 className="h-3 w-3 animate-spin" />;
      case 'completed':
      case 'active':
        return <CheckCircle className="h-3 w-3" />;
      case 'failed':
      case 'suspended':
        return <AlertCircle className="h-3 w-3" />;
      default:
        return <Clock className="h-3 w-3" />;
    }
  };

  const getWebsiteStatusText = (status?: string) => {
    if (!status) return 'Not Started';
    switch (status) {
      case 'generating':
        return 'Generating...';
      case 'completed':
        return 'Live';
      case 'failed':
        return 'Failed';
      case 'updating':
        return 'Updating...';
      default:
        return 'Unknown';
    }
  };

  const websiteUrl = `https://${tenant.subdomain}.${process.env.NEXT_PUBLIC_MAIN_DOMAIN || 'localhost:3000'}`;

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg">{tenant.businessName}</CardTitle>
            <CardDescription className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              {tenant.subdomain}.{process.env.NEXT_PUBLIC_MAIN_DOMAIN || 'localhost:3000'}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="flex items-center gap-1">
              <div className={`w-2 h-2 rounded-full ${getStatusColor(tenant.status)}`} />
              {tenant.status}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Business Type:</span>
            <p className="font-medium capitalize">{tenant.businessType}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Created:</span>
            <p className="font-medium">{new Date(tenant.createdAt).toLocaleDateString()}</p>
          </div>
        </div>

        <Separator />

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Website Status</span>
            <Badge variant="secondary" className="flex items-center gap-1">
              {getStatusIcon(tenant.website?.status)}
              {getWebsiteStatusText(tenant.website?.status)}
            </Badge>
          </div>

          {tenant.website?.status === 'generating' && (
            <div className="space-y-2">
              <Progress value={progress} className="w-full" />
              <p className="text-xs text-muted-foreground">
                AI is generating your website... This usually takes 1-2 minutes.
              </p>
            </div>
          )}

          {tenant.website?.status === 'failed' && (
            <p className="text-sm text-destructive">
              Website generation failed. Please try again or contact support.
            </p>
          )}

          {tenant.website?.status === 'completed' && tenant.generatedAt && (
            <p className="text-xs text-muted-foreground">
              Generated on {new Date(tenant.generatedAt).toLocaleDateString()} at{' '}
              {new Date(tenant.generatedAt).toLocaleTimeString()}
            </p>
          )}
        </div>
      </CardContent>

      <CardFooter className="pt-3">
        <div className="flex items-center gap-2 w-full">
          {tenant.website?.status === 'completed' && (
            <>
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => window.open(websiteUrl, '_blank')}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Visit Site
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onView(tenant.id)}
              >
                <Eye className="h-4 w-4" />
              </Button>
            </>
          )}

          {tenant.website?.status !== 'completed' && (
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => onView(tenant.id)}
            >
              <Eye className="h-4 w-4 mr-2" />
              Preview
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => onEdit(tenant.id)}
          >
            <Edit className="h-4 w-4" />
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => onRegenerate(tenant.id)}
            disabled={tenant.website?.status === 'generating'}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>

          <Button
            variant="outline"
            size="sm"
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}