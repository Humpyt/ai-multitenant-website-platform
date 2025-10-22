import { AppDataSource } from './config';
import { Tenant, TenantWebsite } from './entities';

export { AppDataSource, Tenant, TenantWebsite };

export const initializeDatabase = async () => {
  try {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
      console.log('Database connection established successfully');
    }
  } catch (error) {
    console.error('Error during database initialization:', error);
    throw error;
  }
};

export const getTenantRepository = () => {
  return AppDataSource.getRepository(Tenant);
};

export const getTenantWebsiteRepository = () => {
  return AppDataSource.getRepository(TenantWebsite);
};