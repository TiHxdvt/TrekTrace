/**
 * GPS 卡尔曼滤波器
 *
 * 状态向量（4 维）：[lat, lon, vLat, vLon]
 * - lat/lon：经纬度位置
 * - vLat/vLon：经纬度方向速度（度/秒）
 *
 * 观测模型：只观测位置（经纬度），不观测速度。
 * GPS 精度直接作为观测噪声 R——精度高的点权重大，
 * 精度低的点被周围趋势修正。
 *
 * 经度方向度-米转换根据当前纬度做 cos(lat) 修正。
 * 每次更新后强制协方差矩阵对称，防止浮点累积漂移。
 */

import type { RawLocationPoint } from '../types';

export interface KalmanOutput {
  latitude: number;
  longitude: number;
  isOutlier: boolean;
}

/** 滤波器内部使用的精简输入（只取需要的字段） */
type FilterInput = Pick<RawLocationPoint, 'latitude' | 'longitude' | 'accuracy' | 'timestamp'>;

// ---------- 矩阵工具（4x4 专用，避免泛型开销） ----------

/** 创建 4x4 单位矩阵 */
function identity4(): number[] {
  return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
}

/** A += B * scalar（原地加法） */
function addScaled4(a: number[], b: number[], s: number): void {
  for (let i = 0; i < 16; i++) a[i] += b[i] * s;
}

/** 4x4 矩阵乘法 C = A * B */
function mul4(a: number[], b: number[]): number[] {
  const c = new Array<number>(16);
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      let sum = 0;
      for (let k = 0; k < 4; k++) sum += a[i * 4 + k] * b[k * 4 + j];
      c[i * 4 + j] = sum;
    }
  }
  return c;
}

/** 4x4 矩阵转置 */
function transpose4(m: number[]): number[] {
  return [
    m[0], m[4], m[8], m[12],
    m[1], m[5], m[9], m[13],
    m[2], m[6], m[10], m[14],
    m[3], m[7], m[11], m[15],
  ];
}

/** 强制 4x4 矩阵对称：P = (P + Pᵀ) / 2（原地） */
function symmetrize4(m: number[]): void {
  for (let i = 0; i < 4; i++) {
    for (let j = i + 1; j < 4; j++) {
      const avg = (m[i * 4 + j] + m[j * 4 + i]) * 0.5;
      m[i * 4 + j] = avg;
      m[j * 4 + i] = avg;
    }
  }
}

/** 2x2 矩阵求逆（显式公式） */
function inv2(m: [number, number, number, number]): [number, number, number, number] {
  const det = m[0] * m[3] - m[1] * m[2];
  if (Math.abs(det) < 1e-30) {
    return [1, 0, 0, 1];
  }
  const id = 1 / det;
  return [m[3] * id, -m[1] * id, -m[2] * id, m[0] * id];
}

// ---------- 常量 ----------

/** 过程噪声加速度标准差（m/s²），表征运动不确定性 */
const PROCESS_ACCEL_SIGMA = 5.0;

/** 创新量（innovation）拒绝阈值：超过 N 倍标准差视为异常 */
const INNOVATION_GATE = 5.0;

/** 初始速度不确定度（度/秒） */
const INIT_VEL_VARIANCE = 1e-5;

// ---------- 滤波器 ----------

export class GpsKalmanFilter {
  // 状态向量 [lat, lon, vLat, vLon]
  private x = [0, 0, 0, 0];

  // 协方差矩阵 4x4（行优先）
  private P: number[] = identity4();

  // 上一时间戳（秒）
  private lastT = 0;

  // 是否已初始化
  private initialized = false;

  // ---------- 公共 API ----------

  reset(): void {
    this.x = [0, 0, 0, 0];
    this.P = identity4();
    this.lastT = 0;
    this.initialized = false;
  }

  /**
   * 用已知位置初始化滤波器状态（用于 session 恢复）
   */
  seedPosition(lat: number, lon: number, accuracy: number): void {
    this.x = [lat, lon, 0, 0];
    const posVarLat = metersToDegreesLat(accuracy) ** 2;
    const posVarLon = metersToDegreesLon(accuracy, lat) ** 2;
    const velVar = INIT_VEL_VARIANCE;
    this.P = [
      posVarLat, 0, 0, 0,
      0, posVarLon, 0, 0,
      0, 0, velVar, 0,
      0, 0, 0, velVar,
    ];
    this.lastT = 0;
    this.initialized = true;
  }

  /**
   * 处理一个原始 GPS 点，返回滤波后的坐标
   */
  process(raw: FilterInput): KalmanOutput {
    const t = raw.timestamp / 1000; // 毫秒 → 秒

    // 首个点：直接用观测初始化
    if (!this.initialized) {
      return this.firstObservation(raw, t);
    }

    // 时间倒流保护
    const dt = t - this.lastT;
    if (dt <= 0) {
      return { latitude: this.x[0], longitude: this.x[1], isOutlier: false };
    }
    this.lastT = t;

    // ---- 预测（Predict） ----
    const xp = [
      this.x[0] + this.x[2] * dt,
      this.x[1] + this.x[3] * dt,
      this.x[2],
      this.x[3],
    ];

    // P_pred = F * P * F^T + Q
    const F = [
      1, 0, dt, 0,
      0, 1, 0, dt,
      0, 0, 1, 0,
      0, 0, 0, 1,
    ];
    const Ft = transpose4(F);
    let Pp = mul4(mul4(F, this.P), Ft);
    const Q = this.buildQ(dt);
    addScaled4(Pp, Q, 1);

    // ---- 创新（Innovation） ----
    const y0 = raw.latitude - xp[0];
    const y1 = raw.longitude - xp[1];

    // S = H * P_pred * H^T + R（左上 2x2 子块）
    const accVarLat = metersToDegreesLat(raw.accuracy) ** 2;
    const accVarLon = metersToDegreesLon(raw.accuracy, xp[0]) ** 2;
    const S: [number, number, number, number] = [
      Pp[0] + accVarLat, Pp[1],
      Pp[4], Pp[5] + accVarLon,
    ];

    // 马氏距离平方 = y^T * S⁻¹ * y
    const Si = inv2(S);
    const maha2 = y0 * (y0 * Si[0] + y1 * Si[2]) + y1 * (y0 * Si[1] + y1 * Si[3]);
    const isOutlier = maha2 > INNOVATION_GATE * INNOVATION_GATE;

    if (isOutlier) {
      // 异常点：只更新预测，不融合观测
      this.x = xp;
      this.P = Pp;
      symmetrize4(this.P);
      return { latitude: xp[0], longitude: xp[1], isOutlier: true };
    }

    // ---- 更新（Update） ----
    // K = P_pred * H^T * S⁻¹（4x2 矩阵）
    // H^T = [1 0; 0 1; 0 0; 0 0]，所以 P_pred * H^T = P 的前两列
    const PHt = [
      Pp[0], Pp[1],
      Pp[4], Pp[5],
      Pp[8], Pp[9],
      Pp[12], Pp[13],
    ];
    const K = [
      PHt[0] * Si[0] + PHt[1] * Si[2], PHt[0] * Si[1] + PHt[1] * Si[3],
      PHt[2] * Si[0] + PHt[3] * Si[2], PHt[2] * Si[1] + PHt[3] * Si[3],
      PHt[4] * Si[0] + PHt[5] * Si[2], PHt[4] * Si[1] + PHt[5] * Si[3],
      PHt[6] * Si[0] + PHt[7] * Si[2], PHt[6] * Si[1] + PHt[7] * Si[3],
    ];

    // x = x_pred + K * y
    this.x = [
      xp[0] + K[0] * y0 + K[1] * y1,
      xp[1] + K[2] * y0 + K[3] * y1,
      xp[2] + K[4] * y0 + K[5] * y1,
      xp[3] + K[6] * y0 + K[7] * y1,
    ];

    // P = (I - K * H) * P_pred
    const I_KH = identity4();
    I_KH[0] -= K[0]; I_KH[1] -= K[1];
    I_KH[4] -= K[2]; I_KH[5] -= K[3];
    I_KH[8] -= K[4]; I_KH[9] -= K[5];
    I_KH[12] -= K[6]; I_KH[13] -= K[7];

    this.P = mul4(I_KH, Pp);
    symmetrize4(this.P);

    return { latitude: this.x[0], longitude: this.x[1], isOutlier: false };
  }

  // ---------- 私有方法 ----------

  private firstObservation(raw: FilterInput, t: number): KalmanOutput {
    this.x = [raw.latitude, raw.longitude, 0, 0];
    const posVarLat = metersToDegreesLat(raw.accuracy) ** 2;
    const posVarLon = metersToDegreesLon(raw.accuracy, raw.latitude) ** 2;
    const velVar = INIT_VEL_VARIANCE;
    this.P = [
      posVarLat, 0, 0, 0,
      0, posVarLon, 0, 0,
      0, 0, velVar, 0,
      0, 0, 0, velVar,
    ];
    this.lastT = t;
    this.initialized = true;
    return { latitude: raw.latitude, longitude: raw.longitude, isOutlier: false };
  }

  /**
   * 构建过程噪声协方差 Q
   * 纬度方向和经度方向分别使用不同的度-米换算
   * Q = G * diag(σ_lat², σ_lon²) * G^T
   */
  private buildQ(dt: number): number[] {
    const aLat = metersToDegreesLat(PROCESS_ACCEL_SIGMA);
    const aLon = metersToDegreesLon(PROCESS_ACCEL_SIGMA, this.x[0]);
    const aLat2 = aLat * aLat;
    const aLon2 = aLon * aLon;
    const dt2 = dt * dt;
    const dt3 = dt2 * dt;
    const dt4 = dt3 * dt;
    return [
      dt4 / 4 * aLat2, 0,              dt3 / 2 * aLat2, 0,
      0,              dt4 / 4 * aLon2, 0,               dt3 / 2 * aLon2,
      dt3 / 2 * aLat2, 0,              dt2 * aLat2,      0,
      0,              dt3 / 2 * aLon2, 0,                dt2 * aLon2,
    ];
  }
}

// ---------- 坐标转换 ----------

/** 米 → 纬度度数 */
function metersToDegreesLat(meters: number): number {
  return meters / 111320;
}

/** 米 → 经度度数（根据纬度做 cos 修正） */
function metersToDegreesLon(meters: number, latDegrees: number): number {
  const cosLat = Math.cos((latDegrees * Math.PI) / 180);
  return meters / (111320 * Math.max(cosLat, 0.01)); // 防止极区除零
}
