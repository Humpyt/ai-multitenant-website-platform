'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Save, ArrowLeft, ExternalLink, Code, Globe } from 'lucide-react';

interface WebsiteData {
  html: string;
  css: string;
  js: string;
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
  };
}

export default function TenantEditPage() {
  const params = useParams();
  const router = useRouter();
  const tenantId = params.tenantId as string;

  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [websiteData, setWebsiteData] = useState<WebsiteData>({
    html: '',
    css: '',
    js: '',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [activeTab, setActiveTab] = useState('html');

  useEffect(() => {
    fetchTenantData();
  }, [tenantId]);

  const fetchTenantData = async () => {
    try {
      // Fetch tenant info
      const tenantResponse = await fetch(`/api/tenants/${tenantId}/website`);
      const tenantData = await tenantResponse.json();

      if (tenantData.success) {
        setTenant(tenantData.tenant);

        // Fetch website content if completed
        if (tenantData.website?.status === 'completed') {
          const websiteResponse = await fetch(tenantData.website.urls.html);
          const htmlContent = await websiteResponse.text();

          const cssResponse = await fetch(tenantData.website.urls.css);
          const cssContent = await cssResponse.text();

          const jsResponse = await fetch(tenantData.website.urls.js);
          const jsContent = await jsResponse.text();

          setWebsiteData({
            html: htmlContent,
            css: cssContent,
            js: jsContent,
          });
        }
      } else {
        console.error('Failed to fetch tenant data:', tenantData.error);
      }
    } catch (error) {
      console.error('Error fetching tenant data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveMessage('');

    try {
      const response = await fetch(`/api/tenants/${tenantId}/website`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(websiteData),
      });

      const data = await response.json();

      if (data.success) {
        setSaveMessage('Website updated successfully!');
        setTimeout(() => setSaveMessage(''), 3000);
      } else {
        setSaveMessage(`Error: ${data.error}`);
      }
    } catch (error) {
      setSaveMessage('Error updating website');
      console.error('Error updating website:', error);
    } finally {
      setIsSaving(false);
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
          <p className="text-muted-foreground">Loading website editor...</p>
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
            onClick={() => router.push(`/tenants/${tenantId}/preview`)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Preview
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Edit Website</h1>
            <p className="text-muted-foreground flex items-center gap-2">
              <Globe className="h-4 w-4" />
              {tenant.businessName} - {tenant.subdomain}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {saveMessage && (
            <Alert className="max-w-xs">
              <AlertDescription>{saveMessage}</AlertDescription>
            </Alert>
          )}

          <Button onClick={() => window.open(getWebsiteUrl(), '_blank')} variant="outline">
            <ExternalLink className="h-4 w-4 mr-2" />
            View Live
          </Button>

          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </div>

      {tenant.website?.status !== 'completed' ? (
        <Card>
          <CardContent className="text-center py-16">
            <Code className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">Website Not Generated Yet</h2>
            <p className="text-muted-foreground mb-4">
              The website for this tenant has not been completed yet. Please wait for the generation to finish or start a new generation.
            </p>
            <Button onClick={() => router.push(`/tenants/${tenantId}/preview`)}>
              Back to Preview
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Source Code Editor</CardTitle>
            <CardDescription>
              Edit your website's HTML, CSS, and JavaScript. Changes will be reflected immediately after saving.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="html">HTML</TabsTrigger>
                <TabsTrigger value="css">CSS</TabsTrigger>
                <TabsTrigger value="js">JavaScript</TabsTrigger>
              </TabsList>

              <TabsContent value="html" className="mt-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">HTML Structure</label>
                  <Textarea
                    value={websiteData.html}
                    onChange={(e) => setWebsiteData(prev => ({ ...prev, html: e.target.value }))}
                    className="min-h-[500px] font-mono text-sm"
                    placeholder="Enter your HTML code here..."
                  />
                </div>
              </TabsContent>

              <TabsContent value="css" className="mt-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">CSS Styles</label>
                  <Textarea
                    value={websiteData.css}
                    onChange={(e) => setWebsiteData(prev => ({ ...prev, css: e.target.value }))}
                    className="min-h-[500px] font-mono text-sm"
                    placeholder="Enter your CSS code here..."
                  />
                </div>
              </TabsContent>

              <TabsContent value="js" className="mt-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">JavaScript Code</label>
                  <Textarea
                    value={websiteData.js}
                    onChange={(e) => setWebsiteData(prev => ({ ...prev, js: e.target.value }))}
                    className="min-h-[500px] font-mono text-sm"
                    placeholder="Enter your JavaScript code here..."
                  />
                </div>
              </TabsContent>
            </Tabs>

            <div className="mt-6 flex justify-end">
              <Button onClick={handleSave} disabled={isSaving} size="lg">
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving Changes...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save All Changes
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}