/**
 * Activity API 服务
 * 封装后端活动相关 API 调用
 */

import api from './api';
import {
  ActivityUploadRequest,
  ActivityResponseDTO,
  ActivityListParams,
  PaginatedResponse,
  TrackPointUploadDTO,
} from '../types';

export const activityService = {
  async uploadActivity(data: ActivityUploadRequest): Promise<ActivityResponseDTO> {
    const response = await api.post<ActivityResponseDTO>('/activities', data);
    return response.data;
  },

  async getActivities(): Promise<ActivityResponseDTO[]> {
    const response = await api.get<ActivityResponseDTO[]>('/activities');
    return response.data;
  },

  async getActivitiesPaged(params: ActivityListParams = {}): Promise<PaginatedResponse<ActivityResponseDTO>> {
    const query: Record<string, string> = {};
    if (params.page !== undefined) query.page = String(params.page);
    if (params.size !== undefined) query.size = String(params.size);
    if (params.type) query.type = params.type;
    if (params.startDate) query.startDate = params.startDate;
    if (params.endDate) query.endDate = params.endDate;
    const qs = new URLSearchParams(query).toString();
    const response = await api.get<PaginatedResponse<ActivityResponseDTO>>(
      `/activities/paged${qs ? '?' + qs : ''}`,
    );
    return response.data;
  },

  async getActiveDates(year: number, month: number): Promise<string[]> {
    const response = await api.get<string[]>(
      `/activities/active-dates?year=${year}&month=${month}`,
    );
    return response.data;
  },

  async getActivity(id: number): Promise<ActivityResponseDTO> {
    const response = await api.get<ActivityResponseDTO>(`/activities/${id}`);
    return response.data;
  },

  async getTrackPoints(id: number): Promise<TrackPointUploadDTO[]> {
    const response = await api.get<TrackPointUploadDTO[]>(`/activities/${id}/track-points`);
    return response.data;
  },

  async deleteActivity(id: number): Promise<void> {
    await api.delete(`/activities/${id}`);
  },

  async batchDeleteActivities(ids: number[]): Promise<void> {
    await api.delete('/activities/batch', { data: ids });
  },
};
