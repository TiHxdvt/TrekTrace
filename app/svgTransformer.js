const { transform: svgrTransform } = require('@svgr/core');
const upstreamTransformer = require('@react-native/metro-babel-transformer');

/**
 * 自定义 SVG transformer
 *
 * 处理两个 react-native-svg 不兼容的问题：
 * 1. currentColor → 替换为 props.color（通过 SVGR replaceAttrValues）
 * 2. 1em 单位 → 通过 dimensions:false 去掉（尺寸由包装组件控制）
 */
const svgrConfig = {
  native: true,
  dimensions: false,
  replaceAttrValues: { currentColor: '{props.color}' },
  plugins: ['@svgr/plugin-svgo', '@svgr/plugin-jsx'],
  svgoConfig: {
    plugins: [{
      name: 'preset-default',
      params: {
        overrides: {
          inlineStyles: { onlyMatchedOnce: false },
          removeViewBox: false,
          removeUnknownsAndDefaults: false,
          convertColors: false,
        },
      },
    }],
  },
};

module.exports.transform = async ({ src, filename, ...rest }) => {
  if (filename.endsWith('.svg')) {
    const output = await svgrTransform(src, svgrConfig, { filePath: filename });
    return upstreamTransformer.transform({ src: output, filename, ...rest });
  }
  return upstreamTransformer.transform({ src, filename, ...rest });
};
