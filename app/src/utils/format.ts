/**
 * 共享格式化工具函数
 */

/**
 * 格式化时长：秒 → h:mm:ss 或 mm:ss
 * 不足一小时时分钟位补零（如 00:05、05:30）
 */
export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/**
 * 格式化距离：米 → 可读字符串
 * >= 1km 显示 x.xkm，否则显示 xm
 */
export function formatDistance(meters: number): string {
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(1)}km`;
  }
  return `${Math.round(meters)}m`;
}

/**
 * 格式化配速：接收秒/公里
 * 返回 m'ss" 格式，无效值返回 --'--
 */
export function formatPace(secondsPerKm: number): string {
  if (secondsPerKm <= 0 || !isFinite(secondsPerKm)) return "--'--\"";
  const m = Math.floor(secondsPerKm / 60);
  const s = Math.floor(secondsPerKm % 60);
  return `${m}'${String(s).padStart(2, '0')}"`;
}

/**
 * 根据距离和时长计算并格式化配速
 * @param distanceMeters 距离（米）
 * @param durationSeconds 时长（秒）
 */
export function formatPaceFromDistance(distanceMeters: number, durationSeconds: number): string {
  if (distanceMeters <= 0 || durationSeconds <= 0) return "--'--\"";
  const secondsPerKm = durationSeconds / (distanceMeters / 1000);
  return formatPace(secondsPerKm);
}
