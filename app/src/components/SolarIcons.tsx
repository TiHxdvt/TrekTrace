/**
 * Solar 图标集 - SVG 组件
 * 从 demo (generated-page.html) 提取的 Solar 图标 SVG paths
 * 使用 react-native-svg 渲染
 */

import React from 'react';
import Svg, {
  Circle,
  Path,
  Rect,
} from 'react-native-svg';

type IconProps = {
  size?: number;
  color?: string;
  strokeWidth?: number;
};

// ==================== 导航栏图标 ====================

/** solar:map-point-linear - 记录/运动 Tab */
export const IconMapPoint = ({ size = 24, color = 'currentColor', strokeWidth = 1.5 }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M4 10.143C4 5.646 7.582 2 12 2s8 3.646 8 8.143c0 4.462-2.553 9.67-6.537 11.531a3.45 3.45 0 0 1-2.926 0C6.553 19.812 4 14.606 4 10.144Z"
      stroke={color}
      strokeWidth={strokeWidth}
    />
    <Circle cx="12" cy="10" r="3" stroke={color} strokeWidth={strokeWidth} />
  </Svg>
);

/** lucide:plane - 历史 Tab */
export const IconPlane = ({ size = 24, color = 'currentColor', strokeWidth = 2 }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

/** solar:heart-linear - 统计 Tab */
export const IconHeart = ({ size = 24, color = 'currentColor', strokeWidth = 1.5 }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M2 9.137C2 14 6.02 16.591 8.962 18.911C10 19.729 11 20.5 12 20.5s2-.77 3.038-1.59C17.981 16.592 22 14 22 9.138S16.5.825 12 5.501C7.5.825 2 4.274 2 9.137"
      fill={color}
    />
  </Svg>
);

/** solar:chat-round-line-linear - 我的 Tab */
export const IconChatRoundLine = ({ size = 24, color = 'currentColor', strokeWidth = 1.5 }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2S2 6.477 2 12c0 1.6.376 3.112 1.043 4.453c.178.356.237.763.134 1.148l-.595 2.226a1.3 1.3 0 0 0 1.591 1.592l2.226-.596a1.63 1.63 0 0 1 1.149.133A9.96 9.96 0 0 0 12 22Z"
      stroke={color}
      strokeWidth={strokeWidth}
    />
    <Path
      d="M8 10.5h8M8 14h5.5"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
    />
  </Svg>
);

// ==================== 头部搜索栏图标 ====================

/** solar:hamburger-menu-linear - 菜单按钮 */
export const IconHamburgerMenu = ({ size = 24, color = 'currentColor', strokeWidth = 1.5 }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M20 7H4m16 5H4m16 5H4"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
    />
  </Svg>
);

/** solar:magnifer-linear - 搜索图标 */
export const IconMagnifer = ({ size = 24, color = 'currentColor', strokeWidth = 1.5 }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="11.5" cy="11.5" r="9.5" stroke={color} strokeWidth={strokeWidth} />
    <Path
      d="M18.5 18.5L22 22"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
    />
  </Svg>
);

/** solar:microphone-linear - 语音按钮 */
export const IconMicrophone = ({ size = 24, color = 'currentColor', strokeWidth = 1.5 }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect x="7" y="3" width="10" height="11" rx="5" stroke={color} strokeWidth={strokeWidth} />
    <Path
      d="M13 8h4m-4 3h4m3-1v1a8 8 0 1 1-16 0v-1m8 9v3"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
    />
  </Svg>
);

// ==================== 分类选择器图标 ====================

/** solar:running-2-linear - 跑步 (替换 emoji) */
export const IconRunning = ({ size = 24, color = 'currentColor', strokeWidth = 1.5 }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="13.5" cy="3.5" r="2.5" stroke={color} strokeWidth={strokeWidth} />
    <Path
      d="M6 19l2-5 3 1.5L14 9l3 4 2-1"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M9 21l1.5-3.5L8 16l1-4"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

/** solar:bicycle-linear - 骑行 (替换 emoji) */
export const IconBicycle = ({ size = 24, color = 'currentColor', strokeWidth = 1.5 }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="6" cy="17" r="3.5" stroke={color} strokeWidth={strokeWidth} />
    <Circle cx="18" cy="17" r="3.5" stroke={color} strokeWidth={strokeWidth} />
    <Path
      d="M6 17l3-7h6l-2 4h5M15 10l2-3M12 10l-3 7"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

/** solar:bonfire-linear - 徒步 (使用篝火图标，demo 中 Camping 分类使用) */
export const IconBonfire = ({ size = 24, color = 'currentColor', strokeWidth = 1.5 }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M18 8.807C18 13.761 13.733 15 11.6 15C9.733 15 6 13.761 6 8.807C6 6.71 7.208 5.358 8.261 4.653c.535-.36 1.223-.101 1.312.523c.178 1.245 1.305 2.173 1.987 1.104c.582-.914.793-2.148.793-2.891c0-1.1 1.15-1.798 2.048-1.124C16.15 3.577 18 5.776 18 8.807Z"
      stroke={color}
      strokeWidth={strokeWidth}
    />
    <Path
      d="M20 15L4 22m0-7l5 2.188M20 22l-5.5-2.406M15 10c-.2.667-1.08 2-3 2"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
    />
  </Svg>
);

// ==================== 地图卡片图标 ====================

/** solar:star-bold - 星标/评分 */
export const IconStar = ({ size = 24, color = 'currentColor' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <Path d="M9.153 5.408C10.42 3.136 11.053 2 12 2s1.58 1.136 2.847 3.408l.328.588c.36.646.54.969.82 1.182s.63.292 1.33.45l.636.144c2.46.557 3.689.835 3.982 1.776c.292.94-.546 1.921-2.223 3.882l-.434.507c-.476.557-.715.836-.822 1.18c-.107.345-.071.717.001 1.46l.066.677c.253 2.617.38 3.925-.386 4.506s-1.918.051-4.22-1.009l-.597-.274c-.654-.302-.981-.452-1.328-.452s-.674.15-1.328.452l-.596.274c-2.303 1.06-3.455 1.59-4.22 1.01c-.767-.582-.64-1.89-.387-4.507l.066-.676c.072-.744.108-1.116 0-1.46c-.106-.345-.345-.624-.821-1.18l-.434-.508c-1.677-1.96-2.515-2.941-2.223-3.882S3.58 8.328 6.04 7.772l.636-.144c.699-.158 1.048-.237 1.329-.45s.46-.536.82-1.182z" />
  </Svg>
);

/** solar:heart-bold - 红色心形 */
export const IconHeartBold = ({ size = 24, color = '#ec4899' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <Path d="M2 9.137C2 14 6.02 16.591 8.962 18.911C10 19.729 11 20.5 12 20.5s2-.77 3.038-1.59C17.981 16.592 22 14 22 9.138S16.5.825 12 5.501C7.5.825 2 4.274 2 9.137" />
  </Svg>
);

// ==================== 统计卡片图标 ====================

/** solar:bolt-linear - 闪电/配速 */
export const IconBolt = ({ size = 24, color = 'currentColor', strokeWidth = 1.5 }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M13 2L4.5 13h5.5l-1 9L19.5 11H14l1-9z"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinejoin="round"
    />
  </Svg>
);

/** solar:graph-up-linear - 海拔/图表 */
export const IconGraphUp = ({ size = 24, color = 'currentColor', strokeWidth = 1.5 }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M3 19l5-5 4 2 9-9"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M17 3h4v4"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

/** solar:fire-linear - 卡路里/火焰 */
export const IconFire = ({ size = 24, color = 'currentColor', strokeWidth = 1.5 }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 22c-4.97 0-8-3.03-8-8c0-4.97 4.03-9.5 5.5-11l1.5 3c.5-1.5 1.5-3.5 3-5c.5 3 3 5.5 3 8c0 2-1 4-3 5c1-2 0-4-1-5.5c-.5 2-2 4-4 5"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

// ==================== 通用辅助图标 ====================

/** solar:settings-linear - 设置 */
export const IconSettings = ({ size = 24, color = 'currentColor', strokeWidth = 1.5 }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="3" stroke={color} strokeWidth={strokeWidth} />
    <Path
      d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32l1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41m11.32-11.32l1.41-1.41"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
    />
  </Svg>
);

/** solar:alt-arrow-left-linear - 返回 */
export const IconArrowLeft = ({ size = 24, color = 'currentColor', strokeWidth = 1.5 }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="m15 5l-6 7l6 7"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

/** solar:alt-arrow-right-linear - 向右箭头 */
export const IconArrowRight = ({ size = 24, color = 'currentColor', strokeWidth = 1.5 }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="m9 5l6 7l-6 7"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

/** solar:user-linear - 用户 */
export const IconUser = ({ size = 24, color = 'currentColor', strokeWidth = 1.5 }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="6" r="4" stroke={color} strokeWidth={strokeWidth} />
    <Path
      d="M20 17.5c0 2.485 0 4.5-8 4.5s-8-2.015-8-4.5S7.582 13 12 13s8 2.015 8 4.5Z"
      stroke={color}
      strokeWidth={strokeWidth}
    />
  </Svg>
);

/** solar:calendar-linear - 日历 */
export const IconCalendar = ({ size = 24, color = 'currentColor', strokeWidth = 1.5 }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M2 12c0-3.771 0-5.657 1.172-6.828S6.229 4 10 4h4c3.771 0 5.657 0 6.828 1.172S22 8.229 22 12v2c0 3.771 0 5.657-1.172 6.828S17.771 22 14 22h-4c-3.771 0-5.657 0-6.828-1.172S2 17.771 2 14z"
      stroke={color}
      strokeWidth={strokeWidth}
    />
    <Path
      d="M7 4V2.5M17 4V2.5M2.5 9h19"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
    />
  </Svg>
);

/** solar:logout-2-linear - 退出登录 */
export const IconLogout = ({ size = 24, color = 'currentColor', strokeWidth = 1.5 }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);
