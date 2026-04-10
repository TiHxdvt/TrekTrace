/**
 * Activity API 服务
 * 封装后端活动相关 API 调用
 */

import api from './api';
import {
  ActivityUploadRequest,
  ActivityResponseDTO,
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
};
