/**
 * Discord notification functions
 */

import 'dotenv/config';
import { AxiosInstance } from 'axios';
import { sleep } from './utils';
import { info, warn, error } from './logger';
import Rental, { type RentalConstructorData } from './Rental';

interface DiscordEmbedField {
  name: string;
  value: string;
  inline?: boolean;
}

interface DiscordEmbed {
  title: string;
  url?: string;
  color: number;
  fields: DiscordEmbedField[];
  footer: {
    text: string;
  };
  timestamp: string;
  image?: {
    url: string;
  };
}

interface DiscordPayload {
  embeds: DiscordEmbed[];
  avatar_url: string;
  flags?: number;
}

interface NotificationConfig {
  notificationDelay?: number;
  [key: string]: any;
}

interface FilterOptions {
  mrtDistanceThreshold?: number;
  [key: string]: any;
}

interface RentalWithNotification extends RentalConstructorData {
  notification?: {
    isSilent?: boolean;
    distanceFromMRT?: number | null;
    [key: string]: any;
  };
}

/**
 * Send embed to Discord webhook
 */
const sendToDiscord = async (
  embed: DiscordEmbed, 
  webhookUrl: string, 
  axios: AxiosInstance, 
  silent: boolean = false
): Promise<boolean> => {
  if (!webhookUrl) {
    warn('Discord webhook URL not configured, skipping notification');
    return false;
  }
  
  try {
    const payload: DiscordPayload = { 
      embeds: [embed],
      avatar_url: 'https://i.imgur.com/izKG7gm.jpeg'
    };
    if (silent) {
      payload.flags = 4096; // SUPPRESS_NOTIFICATIONS flag
    }
    
    await axios.post(webhookUrl, payload);
    return true;
  } catch (err: any) {
    error(`Discord notification failed: ${err.message}`);
    return false;
  }
};

/**
 * Create Discord embed for rental
 */
const createRentalEmbed = (
  rentalData: RentalConstructorData, 
  index: number, 
  total: number, 
  silent: boolean = false, 
  distanceThreshold?: number, 
  originalUrl: string = ''
): DiscordEmbed => {
  const rental = new Rental(rentalData);
  
  // Get the closest metro station information
  const getClosestMetroInfo = (): string => {
    const allDistances = rental.getAllMetroDistances();
    if (allDistances.length === 0) {
      return `${rentalData.metroTitle || ''} ${rentalData.metroValue || 'N/A'}`.trim();
    }
    
    // Find the station with minimum distance
    const validDistances = allDistances.filter(d => d.distance !== null && d.distance !== undefined);
    if (validDistances.length === 0) {
      return `${rentalData.metroTitle || ''} ${rentalData.metroValue || 'N/A'}`.trim();
    }
    
    const closest = validDistances.reduce((min, current) => 
      (current.distance as number) < (min.distance as number) ? current : min
    );
    
    return `${closest.stationName} ${closest.metroValue}`;
  };
  
  const embed: DiscordEmbed = {
    title: rentalData.title || '無標題',
    url: rentalData.link || undefined,
    color: rental.getNotificationColor(distanceThreshold || null),
    fields: [
      { 
        name: '🏠 房型', 
        value: (() => {
          const houseType = rentalData.houseType || 'N/A';
          const rooms = rentalData.rooms || '';
          // Avoid redundancy: if houseType contains "套房" and rooms is "套房", don't repeat
          if (houseType.includes('套房') && rooms === '套房') {
            return houseType;
          }
          return `${houseType} ${rooms}`.trim();
        })(), 
        inline: true 
      },
      { name: '🚇 捷運距離', value: getClosestMetroInfo(), inline: true },
      { name: '🏷️ 標籤', value: rentalData.tags?.join(', ') || 'N/A', inline: false },
      ...(originalUrl ? [{ name: '🔍 搜尋條件', value: `[查看完整搜尋條件](${originalUrl})`, inline: false }] : [])
    ],
    footer: { 
      text: `${index}/${total} - 591房源通知${rental.isFarFromMRT(distanceThreshold || null) ? ` (距離捷運>${distanceThreshold}m)` : ''}${silent ? ' 🔇' : ''}` 
    },
    timestamp: new Date().toISOString()
  };

  if (rentalData.imgUrls && rentalData.imgUrls.length > 0) {
    embed.image = { url: rentalData.imgUrls[0] };
  }

  return embed;
};

/**
 * Create Discord embed for error notification
 */
const createErrorEmbed = (originalUrl: string, errorMsg: string): DiscordEmbed => {
  return {
    title: '591 爬蟲執行錯誤',
    url: undefined,
    color: 0xff0000,
    fields: [
      { name: '錯誤訊息', value: errorMsg, inline: false },
      { name: '目標URL', value: originalUrl, inline: false }
    ],
    footer: { text: 'Error notification' },
    timestamp: new Date().toISOString()
  };
};

/**
 * Send multiple rental notifications with delay
 */
const sendDiscordNotifications = async (
  rentals: RentalWithNotification[], 
  originalUrl: string, 
  webhookUrl: string, 
  axios: AxiosInstance, 
  config: NotificationConfig = {}, 
  filter: FilterOptions = {}
): Promise<void> => {
  if (rentals.length === 0) return;

  const notificationDelay = config.notificationDelay || 1000;
  const distanceThreshold = filter.mrtDistanceThreshold;
  info(`Sending ${rentals.length} Discord notifications...`);
  
  for (let i = 0; i < rentals.length; i++) {
    const rental = rentals[i];
    const { notification } = rental;
    const silent = notification?.isSilent || false;
    
    const embed = createRentalEmbed(rental, i + 1, rentals.length, silent, distanceThreshold, originalUrl);
    
    const sent = await sendToDiscord(embed, webhookUrl, axios, silent);
    if (sent) {
      const notificationType = silent ? '🔇 (silent)' : '🔔 (normal)';
      const distanceInfo = notification?.distanceFromMRT ? ` (${notification.distanceFromMRT}m from MRT)` : '';
      info(`✓ Sent notification ${i + 1}/${rentals.length} ${notificationType}${distanceInfo}: ${rental.title}`);
    }
    
    if (i < rentals.length - 1) {
      await sleep(notificationDelay);
    }
  }
};

/**
 * Send error notification
 */
const sendErrorNotification = async (
  originalUrl: string, 
  errorMsg: string, 
  webhookUrl: string, 
  axios: AxiosInstance
): Promise<void> => {
  const embed = createErrorEmbed(originalUrl, errorMsg);
  
  if (await sendToDiscord(embed, webhookUrl, axios)) {
    info('Discord error notification sent successfully');
  }
};

export {
  sendToDiscord,
  createRentalEmbed,
  createErrorEmbed,
  sendDiscordNotifications,
  sendErrorNotification,
  type DiscordEmbed,
  type DiscordEmbedField,
  type DiscordPayload,
  type NotificationConfig,
  type FilterOptions,
  type RentalWithNotification
};