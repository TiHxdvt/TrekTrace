/**
 * 后端统计 API 服务
 */

import api from './api';

export interface RecordEntry {
  value: number;
  date: string;
}

export interface PersonalRecords {
  longestDistance: RecordEntry | null;
  longestDuration: RecordEntry | null;
  highestElevation: RecordEntry | null;
  fastestPace: RecordEntry | null; // sec/km, only for RUNNING/CYCLING
}

export interface TypeSummary {
  count: number;
  distance: number;
  duration: number;
  calories: number;
}

export interface StatsSummaryResponse {
  totalActivities: number;
  totalDistance: number;
  totalDuration: number;
  totalElevationGain: number;
  estimatedCalories: number;
  byType: Record<string, TypeSummary>;
  currentStreak: number;
  longestStreak: number;
  personalRecords: Record<string, PersonalRecords>;
  weight: number | null;
}

export interface TypeBreakdown {
  count: number;
  distance: number;
  duration: number;
}

export interface TimePeriodSummary {
  activeDays: number;
  totalActivities: number;
  totalDistance: number;    // 米
  totalDuration: number;    // 秒
  totalElevationGain: number;
  totalCalories: number;
  byType: Record<string, TypeBreakdown>;
}

export const statsService = {
  getSummary: async (): Promise<StatsSummaryResponse> => {
    const response = await api.get<StatsSummaryResponse>('/stats/summary');
    return response.data;
  },

  getWeekSummary: async (date?: string): Promise<TimePeriodSummary> => {
    const params: Record<string, string> = {};
    if (date) params.date = date;
    const response = await api.get<TimePeriodSummary>('/stats/week', { params });
    return response.data;
  },

  getMonthSummary: async (year?: number, month?: number): Promise<TimePeriodSummary> => {
    const params: Record<string, string> = {};
    if (year !== undefined) params.year = String(year);
    if (month !== undefined) params.month = String(month);
    const response = await api.get<TimePeriodSummary>('/stats/month', { params });
    return response.data;
  },

  getYearSummary: async (year?: number): Promise<TimePeriodSummary> => {
    const params: Record<string, string> = {};
    if (year !== undefined) params.year = String(year);
    const response = await api.get<TimePeriodSummary>('/stats/year', { params });
    return response.data;
  },
};
