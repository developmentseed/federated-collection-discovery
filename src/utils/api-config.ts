import { ApiConfiguration, DEFAULT_API_CONFIGURATIONS } from '../config';

export function getApiConfigurations(): ApiConfiguration[] {
  return DEFAULT_API_CONFIGURATIONS;
}

export function getApiConfigurationByUrl(
  url: string,
): ApiConfiguration | undefined {
  return getApiConfigurations().find((config) => config.url === url);
}

export function hasCustomFilter(url: string): boolean {
  const config = getApiConfigurationByUrl(url);
  return config?.filter !== undefined;
}

export function getFilterInfo(
  url: string,
): { description: string; code: string } | null {
  const config = getApiConfigurationByUrl(url);

  if (!config?.filter || !config?.filterDescription) {
    return null;
  }

  return {
    description: config.filterDescription,
    code: config.filter.toString(),
  };
}

export function applyFilterForApi(url: string, collections: any[]): any[] {
  const config = getApiConfigurationByUrl(url);

  if (!config?.filter) {
    console.log(`no custom filter for ${url}`);
    return collections;
  }

  return collections.filter(config.filter);
}