/**
 * 数据管理服务
 */

import api from './api';

export interface DataSummary {
  totalActivities: number;
  totalDistance: number;
  totalDuration: number;
  totalElevationGain: number;
}

export const dataService = {
  getSummary: async (): Promise<DataSummary> => {
    const response = await api.get<DataSummary>('/data/summary');
    return response.data;
  },

  exportData: async (format: string = 'json'): Promise<any[]> => {
    const response = await api.get('/data/export', { params: { format } });
    return response.data;
  },

  deleteAllActivities: async (): Promise<void> => {
    await api.delete('/data/activities');
  },

  deleteAccount: async (): Promise<void> => {
    await api.delete('/account');
  },
};
