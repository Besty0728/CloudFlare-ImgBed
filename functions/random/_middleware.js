import { checkDatabaseConfig } from '../utils/middleware';
import { domainFilterMiddleware } from '../utils/domainFilter';

export const onRequest = [checkDatabaseConfig, domainFilterMiddleware];