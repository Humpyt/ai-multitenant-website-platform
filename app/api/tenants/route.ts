import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { initializeDatabase, getTenantRepository, getTenantWebsiteRepository } from '@/server/database';
import { Tenant, TenantWebsite, TenantStatus, WebsiteStatus } from '@/server/database/entities';
import { createSubdomainRecord } from '@/lib/aws/route53';
import { nanoid } from 'nanoid';

// Helper function to generate a unique subdomain
const generateUniqueSubdomain = async (businessName: string): Promise<string> => {
  const baseName = businessName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .substring(0, 15);

  let subdomain = baseName;
  let counter = 1;

  const tenantRepo = getTenantRepository();

  // Check if subdomain already exists and generate a unique one
  while (await tenantRepo.findOne({ where: { subdomain } })) {
    subdomain = `${baseName}${counter}`;
    counter++;
  }

  return subdomain;
};

// Helper function to create DNS record for tenant
const createTenantDNS = async (subdomain: string) => {
  try {
    // Get server IP from environment or use a default
    const serverIP = process.env.SERVER_IP || '127.0.0.1';

    const result = await createSubdomainRecord(subdomain, serverIP);

    if (!result.success) {
      console.error(`Failed to create DNS record for ${subdomain}:`, result.error);
      // Continue without DNS for development
      return { success: false, error: result.error };
    }

    return { success: true, changeId: result.changeId };
  } catch (error) {
    console.error('Error creating tenant DNS:', error);
    return { success: false, error: 'DNS creation failed' };
  }
};

export async function POST(request: NextRequest) {
  try {
    // Ensure database is initialized
    await initializeDatabase();

    // Get user session (you might need to adapt this based on your auth setup)
    const session = await getServerSession();

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { businessInfo, brandPreferences, contentRequirements, llmProvider } = body;

    // Validate required fields
    if (!businessInfo?.businessName || !llmProvider?.provider) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const tenantRepo = getTenantRepository();
    const websiteRepo = getTenantWebsiteRepository();

    // Generate unique subdomain
    const subdomain = await generateUniqueSubdomain(businessInfo.businessName);

    // Create tenant
    const tenant = tenantRepo.create({
      name: businessInfo.businessName,
      subdomain,
      userId: session.user.id || session.user.email, // Adapt based on your user ID system
      status: TenantStatus.PENDING,
      businessName: businessInfo.businessName,
      businessType: businessInfo.businessType,
      businessData: {
        ...businessInfo,
        brandPreferences,
        contentRequirements,
      },
      selectedLLM: llmProvider.provider,
    });

    const savedTenant = await tenantRepo.save(tenant);

    // Create tenant website record
    const tenantWebsite = websiteRepo.create({
      tenant: savedTenant,
      status: WebsiteStatus.GENERATING,
    });

    const savedWebsite = await websiteRepo.save(tenantWebsite);

    // Create DNS record (async, don't wait for it)
    createTenantDNS(subdomain).catch(error => {
      console.error(`DNS creation failed for ${subdomain}:`, error);
    });

    // Trigger website generation (you might want to make this async too)
    // This would typically call your AI generation service
    setTimeout(async () => {
      try {
        // TODO: Implement actual AI website generation
        // This would involve calling your LLM provider and storing the result

        // For now, we'll just mark it as completed with a placeholder
        await websiteRepo.update(savedWebsite.id, {
          status: WebsiteStatus.COMPLETED,
          generatedAt: new Date(),
          metadata: {
            generatedBy: llmProvider.provider,
            generationTime: new Date().toISOString(),
          },
        });

        // Update tenant status to active
        await tenantRepo.update(savedTenant.id, {
          status: TenantStatus.ACTIVE,
        });
      } catch (error) {
        console.error('Website generation failed:', error);

        await websiteRepo.update(savedWebsite.id, {
          status: WebsiteStatus.FAILED,
          errorMessage: error instanceof Error ? error.message : 'Generation failed',
        });
      }
    }, 5000); // Simulate 5-second generation time

    return NextResponse.json({
      success: true,
      tenant: {
        id: savedTenant.id,
        name: savedTenant.name,
        subdomain: savedTenant.subdomain,
        status: savedTenant.status,
        businessName: savedTenant.businessName,
        businessType: savedTenant.businessType,
      },
      website: {
        id: savedWebsite.id,
        status: savedWebsite.status,
      },
      message: 'Tenant created successfully. Website generation started.',
    });

  } catch (error) {
    console.error('Error creating tenant:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
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

    const tenantRepo = getTenantRepository();

    // Get all tenants for the current user
    const tenants = await tenantRepo.find({
      where: { userId: session.user.id || session.user.email },
      relations: ['website'],
      order: { createdAt: 'DESC' },
    });

    return NextResponse.json({
      success: true,
      tenants: tenants.map(tenant => ({
        id: tenant.id,
        name: tenant.name,
        subdomain: tenant.subdomain,
        status: tenant.status,
        businessName: tenant.businessName,
        businessType: tenant.businessType,
        createdAt: tenant.createdAt,
        updatedAt: tenant.updatedAt,
        subscriptionStatus: tenant.status === 'active' ? 'active' : 'inactive',
        website: tenant.website ? {
          id: tenant.website.id,
          status: tenant.website.status,
          generatedAt: tenant.website.generatedAt,
          lastUpdated: tenant.website.lastUpdated,
        } : null,
      })),
    });

  } catch (error) {
    console.error('Error fetching tenants:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}