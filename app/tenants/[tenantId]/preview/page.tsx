'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Loader2, ExternalLink, ArrowLeft, Eye, Code, Globe, Clock } from 'lucide-react';

interface WebsiteData {
  html: string;
  css: string;
  js: string;
  urls: {
    html: string;
    css: string;
    js: string;
  };
}

interface Tenant {
  id: string;
  name: string;
  subdomain: string;
  status: string;
  businessName: string;
  businessType: string;
  website: {
    id: string;
    status: string;
    generatedAt?: string;
    lastUpdated?: string;
  };
}

export default function TenantPreviewPage() {
  const params = useParams();
  const router = useRouter();
  const tenantId = params.tenantId as string;

  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [websiteData, setWebsiteData] = useState<WebsiteData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('preview');

  useEffect(() => {
    fetchTenantData();
  }, [tenantId]);

  const fetchTenantData = async () => {
    try {
      const response = await fetch(`/api/tenants/${tenantId}/website`);
      const data = await response.json();

      if (data.success) {
        setTenant(data.tenant);
        setWebsiteData(data.website?.urls || null);
      } else {
        console.error('Failed to fetch tenant data:', data.error);
      }
    } catch (error) {
      console.error('Error fetching tenant data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getWebsiteUrl = () => {
    if (!tenant) return '#';
    return `https://${tenant.subdomain}.${process.env.NEXT_PUBLIC_MAIN_DOMAIN || 'localhost:3000'}`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center space-y-2">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="text-muted-foreground">Loading website preview...</p>
        </div>
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Tenant Not Found</h1>
          <Button onClick={() => router.push('/dashboard')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            onClick={() => router.push('/dashboard')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{tenant.businessName}</h1>
            <p className="text-muted-foreground flex items-center gap-2">
              <Globe className="h-4 w-4" />
              {tenant.subdomain}.{process.env.NEXT_PUBLIC_MAIN_DOMAIN || 'localhost:3000'}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="flex items-center gap-1">
            <div className={`w-2 h-2 rounded-full ${
              tenant.website?.status === 'completed' ? 'bg-green-500' :
              tenant.website?.status === 'generating' ? 'bg-yellow-500' :
              tenant.website?.status === 'failed' ? 'bg-red-500' : 'bg-gray-500'
            }`} />
            {tenant.website?.status || 'Unknown'}
          </Badge>

          {tenant.website?.status === 'completed' && (
            <Button onClick={() => window.open(getWebsiteUrl(), '_blank')}>
              <ExternalLink className="h-4 w-4 mr-2" />
              Visit Live Site
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Website Info */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Website Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Business Name</label>
                <p className="font-medium">{tenant.businessName}</p>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">Business Type</label>
                <p className="font-medium capitalize">{tenant.businessType}</p>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">Status</label>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant={tenant.website?.status === 'completed' ? 'default' : 'secondary'}>
                    {tenant.website?.status || 'Not Started'}
                  </Badge>
                </div>
              </div>

              {tenant.website?.generatedAt && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Generated At</label>
                  <p className="font-medium flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {new Date(tenant.website.generatedAt).toLocaleString()}
                  </p>
                </div>
              )}

              {tenant.website?.lastUpdated && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Last Updated</label>
                  <p className="font-medium">
                    {new Date(tenant.website.lastUpdated).toLocaleString()}
                  </p>
                </div>
              )}

              <Separator />

              <div className="space-y-2">
                <Button className="w-full" variant="outline" asChild>
                  <a href={`/tenants/${tenantId}/edit`}>
                    <Code className="h-4 w-4 mr-2" />
                    Edit Website
                  </a>
                </Button>

                <Button
                  className="w-full"
                  variant="outline"
                  onClick={() => window.open(getWebsiteUrl(), '_blank')}
                  disabled={tenant.website?.status !== 'completed'}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Open in New Tab
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Website Preview */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Website Preview</CardTitle>
              <CardDescription>
                Preview your generated website. This is how it will appear to visitors.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="preview">Preview</TabsTrigger>
                  <TabsTrigger value="html">HTML</TabsTrigger>
                  <TabsTrigger value="css">CSS</TabsTrigger>
                  <TabsTrigger value="js">JavaScript</TabsTrigger>
                </TabsList>

                <TabsContent value="preview" className="mt-4">
                  {tenant.website?.status === 'completed' ? (
                    <div className="border rounded-lg overflow-hidden">
                      <iframe
                        src={getWebsiteUrl()}
                        className="w-full h-[600px] border-0"
                        title="Website Preview"
                        sandbox="allow-same-origin allow-scripts allow-forms"
                      />
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-[400px] border rounded-lg border-dashed">
                      <div className="text-center space-y-2">
                        <Eye className="h-12 w-12 mx-auto text-muted-foreground" />
                        <p className="text-muted-foreground">
                          {tenant.website?.status === 'generating'
                            ? 'Website is currently being generated...'
                            : 'Website has not been generated yet'}
                        </p>
                      </div>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="html" className="mt-4">
                  {websiteData ? (
                    <div className="border rounded-lg p-4">
                      <pre className="text-sm overflow-auto max-h-[600px] bg-muted p-4 rounded">
                        <code>{websiteData.html.substring(0, 5000)}...</code>
                      </pre>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      HTML content not available
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="css" className="mt-4">
                  {websiteData ? (
                    <div className="border rounded-lg p-4">
                      <pre className="text-sm overflow-auto max-h-[600px] bg-muted p-4 rounded">
                        <code>{websiteData.css.substring(0, 5000)}...</code>
                      </pre>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      CSS content not available
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="js" className="mt-4">
                  {websiteData ? (
                    <div className="border rounded-lg p-4">
                      <pre className="text-sm overflow-auto max-h-[600px] bg-muted p-4 rounded">
                        <code>{websiteData.js.substring(0, 5000)}...</code>
                      </pre>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      JavaScript content not available
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}