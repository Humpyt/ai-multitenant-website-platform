import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { initializeDatabase, getTenantRepository, getTenantWebsiteRepository } from '@/server/database';
import { Tenant, TenantWebsite, WebsiteStatus } from '@/server/database/entities';
import { createLLMProvider } from '@/lib/ai/providers';
import { uploadWebsiteToS3, getWebsiteUrls } from '@/lib/aws/s3';
import { BusinessData } from '@/lib/ai/LLMProvider';

// GET endpoint to fetch website content
export async function GET(
  request: NextRequest,
  { params }: { params: { tenantId: string } }
) {
  try {
    // Ensure database is initialized
    await initializeDatabase();

    // Get user session
    const session = await getServerSession();

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { tenantId } = params;

    // Get tenant and verify ownership
    const tenantRepo = getTenantRepository();
    const tenant = await tenantRepo.findOne({
      where: {
        id: tenantId,
        userId: session.user.id || session.user.email,
      },
      relations: ['website'],
    });

    if (!tenant) {
      return NextResponse.json(
        { error: 'Tenant not found' },
        { status: 404 }
      );
    }

    // Get website content from S3
    const websiteFiles = await getWebsiteUrls(tenantId);

    return NextResponse.json({
      success: true,
      tenant: {
        id: tenant.id,
        name: tenant.name,
        subdomain: tenant.subdomain,
        status: tenant.status,
        businessName: tenant.businessName,
        businessType: tenant.businessType,
      },
      website: tenant.website ? {
        id: tenant.website.id,
        status: tenant.website.status,
        generatedAt: tenant.website.generatedAt,
        lastUpdated: tenant.website.lastUpdated,
        urls: websiteFiles,
      } : null,
    });

  } catch (error) {
    console.error('Error fetching website:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST endpoint to generate website
export async function POST(
  request: NextRequest,
  { params }: { params: { tenantId: string } }
) {
  try {
    // Ensure database is initialized
    await initializeDatabase();

    // Get user session
    const session = await getServerSession();

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { tenantId } = params;
    const body = await request.json();

    // Get tenant and verify ownership
    const tenantRepo = getTenantRepository();
    const tenant = await tenantRepo.findOne({
      where: {
        id: tenantId,
        userId: session.user.id || session.user.email,
      },
    });

    if (!tenant) {
      return NextResponse.json(
        { error: 'Tenant not found' },
        { status: 404 }
      );
    }

    // Check if website is already being generated
    const websiteRepo = getTenantWebsiteRepository();
    let tenantWebsite = await websiteRepo.findOne({
      where: { tenant: { id: tenantId } },
    });

    if (tenantWebsite && tenantWebsite.status === WebsiteStatus.GENERATING) {
      return NextResponse.json(
        { error: 'Website generation already in progress' },
        { status: 400 }
      );
    }

    // Create or update website record
    if (!tenantWebsite) {
      tenantWebsite = websiteRepo.create({
        tenant,
        status: WebsiteStatus.GENERATING,
      });
      await websiteRepo.save(tenantWebsite);
    } else {
      await websiteRepo.update(tenantWebsite.id, {
        status: WebsiteStatus.GENERATING,
      });
    }

    // Start website generation in background
    generateWebsiteAsync(tenant, tenantWebsite, body);

    return NextResponse.json({
      success: true,
      message: 'Website generation started',
      website: {
        id: tenantWebsite.id,
        status: WebsiteStatus.GENERATING,
      },
    });

  } catch (error) {
    console.error('Error starting website generation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT endpoint to update website content
export async function PUT(
  request: NextRequest,
  { params }: { params: { tenantId: string } }
) {
  try {
    // Ensure database is initialized
    await initializeDatabase();

    // Get user session
    const session = await getServerSession();

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { tenantId } = params;
    const body = await request.json();
    const { html, css, js } = body;

    if (!html || !css || !js) {
      return NextResponse.json(
        { error: 'Missing required website files' },
        { status: 400 }
      );
    }

    // Get tenant and verify ownership
    const tenantRepo = getTenantRepository();
    const tenant = await tenantRepo.findOne({
      where: {
        id: tenantId,
        userId: session.user.id || session.user.email,
      },
    });

    if (!tenant) {
      return NextResponse.json(
        { error: 'Tenant not found' },
        { status: 404 }
      );
    }

    // Upload updated files to S3
    const uploadResult = await uploadWebsiteToS3(tenantId, { html, css, js });

    if (!uploadResult.success) {
      return NextResponse.json(
        { error: 'Failed to upload website files' },
        { status: 500 }
      );
    }

    // Update website record
    const websiteRepo = getTenantWebsiteRepository();
    await websiteRepo.update(
      { tenant: { id: tenantId } },
      {
        status: WebsiteStatus.COMPLETED,
        lastUpdated: new Date(),
        htmlUrl: uploadResult.html.url,
        cssUrl: uploadResult.css.url,
        jsUrl: uploadResult.js.url,
      }
    );

    return NextResponse.json({
      success: true,
      message: 'Website updated successfully',
      urls: {
        html: uploadResult.html.url,
        css: uploadResult.css.url,
        js: uploadResult.js.url,
      },
    });

  } catch (error) {
    console.error('Error updating website:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Async function to handle website generation
async function generateWebsiteAsync(
  tenant: Tenant,
  tenantWebsite: TenantWebsite,
  requestData: any
) {
  try {
    const websiteRepo = getTenantWebsiteRepository();

    // Extract business data from tenant
    const businessData: BusinessData = {
      businessName: tenant.businessName || tenant.name,
      businessType: tenant.businessType || 'service',
      description: tenant.businessData?.description || 'Professional services business',
      address: tenant.businessData?.address || 'Business Address',
      phone: tenant.businessData?.phone || 'Contact Phone',
      email: tenant.businessData?.email || 'contact@example.com',
      website: tenant.businessData?.website,
      brandPreferences: {
        primaryColor: tenant.businessData?.brandPreferences?.primaryColor || '#3B82F6',
        style: tenant.businessData?.brandPreferences?.style || 'modern',
        features: tenant.businessData?.brandPreferences?.features || [],
      },
      contentRequirements: {
        pages: tenant.businessData?.contentRequirements?.pages || ['Home', 'About', 'Contact'],
        hasLogo: tenant.businessData?.contentRequirements?.hasLogo || false,
        hasImages: tenant.businessData?.contentRequirements?.hasImages || false,
        additionalInfo: tenant.businessData?.contentRequirements?.additionalInfo,
      },
    };

    // Get API key for the selected LLM provider
    const providerType = tenant.selectedLLM || requestData.llmProvider || 'deepseek';
    const apiKey = getProviderApiKey(providerType);

    if (!apiKey) {
      throw new Error(`No API key configured for ${providerType}`);
    }

    // Create LLM provider instance
    const llmProvider = createLLMProvider(providerType, apiKey);

    // Generate website
    const result = await llmProvider.generateSite(businessData);

    if (!result.success || !result.website) {
      throw new Error(result.error || 'Website generation failed');
    }

    // Upload generated website to S3
    const uploadResult = await uploadWebsiteToS3(tenant.id, {
      html: result.website.html,
      css: result.website.css,
      js: result.website.js,
    });

    if (!uploadResult.success) {
      throw new Error('Failed to upload website files to S3');
    }

    // Update website record with success
    await websiteRepo.update(tenantWebsite.id, {
      status: WebsiteStatus.COMPLETED,
      htmlUrl: uploadResult.html.url,
      cssUrl: uploadResult.css.url,
      jsUrl: uploadResult.js.url,
      generatedAt: new Date(),
      lastUpdated: new Date(),
      metadata: {
        ...result.website.metadata,
        generationTime: result.generationTime,
      },
    });

    // Update tenant status to active
    const tenantRepo = getTenantRepository();
    await tenantRepo.update(tenant.id, {
      status: 'active' as any,
    });

    console.log(`Website generated successfully for tenant: ${tenant.name} (${tenant.subdomain})`);

  } catch (error) {
    console.error(`Website generation failed for tenant ${tenant.id}:`, error);

    // Update website record with error
    const websiteRepo = getTenantWebsiteRepository();
    await websiteRepo.update(tenantWebsite.id, {
      status: WebsiteStatus.FAILED,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

// Helper function to get API key for provider
function getProviderApiKey(providerType: string): string | null {
  const keyMap: Record<string, string> = {
    deepseek: process.env.DEEPSEEK_API_KEY || '',
    kimik2: process.env.KIMIK2_API_KEY || '',
    qwen: process.env.QWEN_API_KEY || '',
    zai: process.env.ZAI_API_KEY || '',
  };

  return keyMap[providerType.toLowerCase()] || null;
}