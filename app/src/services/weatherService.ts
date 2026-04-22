/**
 * 和风天气 API 封装
 * 30 分钟缓存，失败不影响录制
 */

import { APP_CONFIG } from '../config';

interface WeatherData {
  condition: string; // e.g. "晴", "多云"
  temperature: number; // Celsius
  icon: string; // icon code from QWeather
}

const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

let cachedWeather: WeatherData | null = null;
let cachedTime = 0;
let cachedLocation = '';

export const weatherService = {
  async getCurrentWeather(
    latitude: number,
    longitude: number,
  ): Promise<WeatherData | null> {
    const locKey = `${latitude.toFixed(2)},${longitude.toFixed(2)}`;

    // Return cached if fresh
    if (cachedWeather && cachedLocation === locKey && Date.now() - cachedTime < CACHE_DURATION) {
      return cachedWeather;
    }

    try {
      const apiKey = APP_CONFIG.QWEATHER_API_KEY;
      if (!apiKey) return null;

      const url = `https://api.qweather.com/v7/weather/now?location=${longitude},${latitude}&key=${apiKey}`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.code === '200' && data.now) {
        const weather: WeatherData = {
          condition: data.now.text || '未知',
          temperature: parseFloat(data.now.temp) || 0,
          icon: data.now.icon || '',
        };
        cachedWeather = weather;
        cachedTime = Date.now();
        cachedLocation = locKey;
        return weather;
      }
      return null;
    } catch {
      // API failure should not affect recording
      return null;
    }
  },
};
