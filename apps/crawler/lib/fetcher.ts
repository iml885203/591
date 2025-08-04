/**
 * HTTP fetching functions with retry mechanism
 */

import { AxiosInstance, AxiosResponse, AxiosRequestConfig } from 'axios';
import { sleep } from './utils';
import { info, warn } from './logger';
import { getConfig } from './config';

interface FetchConfig {
  maxRetries?: number;
  retryDelay?: number;
  timeout?: number;
}

/**
 * Fetch URL with retry mechanism
 */
const fetchWithRetry = async (
  url: string, 
  options: AxiosRequestConfig = {}, 
  axios: AxiosInstance, 
  config: FetchConfig = {}
): Promise<AxiosResponse> => {
  const crawlerConfig = getConfig('crawler');
  const maxRetries = config.maxRetries ?? crawlerConfig.maxRetries;
  const retryDelay = config.retryDelay ?? crawlerConfig.retryDelay;
  const timeout = config.timeout ?? crawlerConfig.timeout;
  
  for (let i = 0; i <= maxRetries; i++) {
    try {
      if (i > 0) info(`Retry attempt ${i}/${maxRetries}`);
      
      return await axios.get(url, { 
        ...options, 
        timeout,
        responseType: 'text',
        responseEncoding: 'utf8'
      });
      
    } catch (error: any) {
      if (i === maxRetries) {
        throw new Error(`Failed after ${maxRetries + 1} attempts: ${error.message}`);
      }
      
      const delay = error.response?.status === 429 ? retryDelay * 2 : retryDelay;
      warn(`Request failed (${i + 1}/${maxRetries + 1}), retrying in ${delay}ms...`);
      
      await sleep(delay);
    }
  }
  
  // This should never be reached due to the throw above, but TypeScript needs it
  throw new Error('Unexpected error in fetchWithRetry');
};

/**
 * Get default request headers for 591.com.tw
 */
const getDefaultHeaders = (): Record<string, string> => {
  const crawlerConfig = getConfig('crawler');
  return {
    'User-Agent': crawlerConfig.userAgent,
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'zh-TW,zh;q=0.9,en;q=0.8',
    'Accept-Encoding': 'gzip, deflate, br'
  };
};

export {
  fetchWithRetry,
  getDefaultHeaders,
  type FetchConfig
};