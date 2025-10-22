import { Route53Client, ChangeResourceRecordSetsCommand, ListHostedZonesCommand, ResourceRecordSetChangeAction } from '@aws-sdk/client-route-53';

interface DNSRecordOptions {
  subdomain: string;
  domain: string;
  value: string;
  type: 'A' | 'CNAME' | 'TXT';
  ttl?: number;
}

interface CreateDNSRecordResult {
  success: boolean;
  changeId?: string;
  error?: string;
}

export class Route53Wrapper {
  private client: Route53Client;
  private hostedZoneId: string;

  constructor() {
    const region = process.env.AWS_REGION || 'us-east-1';
    this.client = new Route53Client({
      region,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });

    this.hostedZoneId = process.env.AWS_ROUTE53_HOSTED_ZONE_ID!;
  }

  async createDNSRecord(options: DNSRecordOptions): Promise<CreateDNSRecordResult> {
    try {
      const { subdomain, domain, value, type, ttl = 300 } = options;
      const fullName = `${subdomain}.${domain}`;

      const command = new ChangeResourceRecordSetsCommand({
        HostedZoneId: this.hostedZoneId,
        ChangeBatch: {
          Changes: [
            {
              Action: ResourceRecordSetChangeAction.CREATE,
              ResourceRecordSet: {
                Name: fullName,
                Type: type,
                TTL: ttl,
                ResourceRecords: [
                  {
                    Value: value,
                  },
                ],
              },
            },
          ],
        },
      });

      const response = await this.client.send(command);

      return {
        success: true,
        changeId: response.ChangeInfo?.Id,
      };
    } catch (error) {
      console.error('Error creating DNS record:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async updateDNSRecord(options: DNSRecordOptions): Promise<CreateDNSRecordResult> {
    try {
      const { subdomain, domain, value, type, ttl = 300 } = options;
      const fullName = `${subdomain}.${domain}`;

      const command = new ChangeResourceRecordSetsCommand({
        HostedZoneId: this.hostedZoneId,
        ChangeBatch: {
          Changes: [
            {
              Action: ResourceRecordSetChangeAction.UPSERT,
              ResourceRecordSet: {
                Name: fullName,
                Type: type,
                TTL: ttl,
                ResourceRecords: [
                  {
                    Value: value,
                  },
                ],
              },
            },
          ],
        },
      });

      const response = await this.client.send(command);

      return {
        success: true,
        changeId: response.ChangeInfo?.Id,
      };
    } catch (error) {
      console.error('Error updating DNS record:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async deleteDNSRecord(subdomain: string, domain: string, type: 'A' | 'CNAME' | 'TXT'): Promise<CreateDNSRecordResult> {
    try {
      const fullName = `${subdomain}.${domain}`;

      const command = new ChangeResourceRecordSetsCommand({
        HostedZoneId: this.hostedZoneId,
        ChangeBatch: {
          Changes: [
            {
              Action: ResourceRecordSetChangeAction.DELETE,
              ResourceRecordSet: {
                Name: fullName,
                Type: type,
                TTL: 300,
                ResourceRecords: [
                  {
                    Value: 'placeholder', // Required for deletion
                  },
                ],
              },
            },
          ],
        },
      });

      const response = await this.client.send(command);

      return {
        success: true,
        changeId: response.ChangeInfo?.Id,
      };
    } catch (error) {
      console.error('Error deleting DNS record:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async listHostedZones() {
    try {
      const command = new ListHostedZonesCommand({});
      const response = await this.client.send(command);
      return response.HostedZones || [];
    } catch (error) {
      console.error('Error listing hosted zones:', error);
      throw error;
    }
  }
}

// Singleton instance
export const route53Wrapper = new Route53Wrapper();

// Helper function to create a subdomain record pointing to a server IP
export const createSubdomainRecord = async (subdomain: string, serverIP: string): Promise<CreateDNSRecordResult> => {
  const domain = process.env.MAIN_DOMAIN?.split(':')[0] || 'localhost'; // Remove port if present

  return route53Wrapper.createDNSRecord({
    subdomain,
    domain,
    value: serverIP,
    type: 'A',
    ttl: 300,
  });
};

// Helper function to create a CNAME record (useful for load balancers)
export const createCNAMErecord = async (subdomain: string, target: string): Promise<CreateDNSRecordResult> => {
  const domain = process.env.MAIN_DOMAIN?.split(':')[0] || 'localhost';

  return route53Wrapper.createDNSRecord({
    subdomain,
    domain,
    value: target,
    type: 'CNAME',
    ttl: 300,
  });
};