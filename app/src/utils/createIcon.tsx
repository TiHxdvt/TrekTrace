import React from 'react';
import { SvgProps } from 'react-native-svg';

type IconProps = SvgProps & { size?: number };

/**
 * 包装 SVG 组件，将 size prop 转换为 width/height
 *
 * react-native-svg-transformer 输出的组件不带默认宽高（dimensions:false），
 * 通过这个包装器统一处理尺寸，默认 24x24
 */
export function createIcon(SvgComponent: React.FC<SvgProps>): React.FC<IconProps> {
  const Icon = ({ size, color, ...props }: IconProps) => (
    <SvgComponent
      width={size ?? 24}
      height={size ?? 24}
      color={color ?? '#ffffff'}
      {...props}
    />
  );
  Icon.displayName = SvgComponent.displayName || 'Icon';
  return Icon;
}
