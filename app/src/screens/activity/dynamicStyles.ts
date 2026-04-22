/**
 * ActivityScreen 动态样式（依赖主题色的部分）
 */

import { StyleSheet } from 'react-native';

export function createDynamicStyles(colors: any, isDarkMode: boolean) {
  return StyleSheet.create({
    container: {
      backgroundColor: colors.BACKGROUND,
    },
    glowOrbTop: {
      backgroundColor: colors.GRADIENT.BLUE,
    },
    glowOrbCenter: {
      backgroundColor: colors.GRADIENT.PINK,
    },
    glowOrbBottom: {
      backgroundColor: colors.GRADIENT.PURPLE,
    },
    headerIconButton: {
      backgroundColor: colors.OVERLAY.LIGHT,
      borderWidth: 1,
      borderColor: colors.BORDER.LIGHT,
    },
    searchBar: {
      backgroundColor: colors.OVERLAY.LIGHT,
      borderWidth: 1,
      borderColor: colors.BORDER.LIGHT,
    },
    searchPlaceholder: {
      color: colors.TEXT.TERTIARY,
    },
    mapGpsStatusWrapper: {
      borderWidth: 1,
      borderColor: colors.BORDER.MEDIUM,
    },
    mapLocateWrapper: {
      borderWidth: 1,
      borderColor: colors.BORDER.MEDIUM,
    },
    mapSimWrapper: {
      backgroundColor: colors.OVERLAY.GPS_SIM,
      borderWidth: 1,
      borderColor: colors.BORDER.MEDIUM,
    },
    mapSimActive: {
      backgroundColor: colors.ERROR_OVERLAY.SIM_BG,
      borderColor: colors.ERROR_OVERLAY.SIM_BORDER,
    },
    simText: {
      color: colors.TEXT.SECONDARY,
    },
    simTextActive: {
      color: colors.TEXT.PRIMARY,
    },
    panelWrapper: {
      backgroundColor: colors.BACKGROUND,
    },
    statDivider: {
      backgroundColor: colors.BORDER.LIGHT,
    },
    statLabel: {
      color: colors.TEXT.QUATERNARY,
    },
    statValue: {
      color: colors.TEXT.PRIMARY,
    },
    statValueDim: {
      color: colors.TEXT.DISABLED,
    },
    statUnit: {
      color: colors.TEXT.QUINARY,
    },
    idleBtnBg: {
      backgroundColor: isDarkMode ? '#2a2d38' : 'rgba(0, 0, 0, 0.06)',
      borderWidth: 1,
      borderColor: colors.BORDER.MEDIUM,
    },
    resumeBtnBg: {
      backgroundColor: colors.SUCCESS,
      shadowColor: colors.SUCCESS,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.4,
      shadowRadius: 8,
    },
    startBtnBg: {
      backgroundColor: colors.PRIMARY,
      shadowColor: colors.PRIMARY,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.4,
    },
    stopBtnBg: {
      backgroundColor: colors.ERROR_OVERLAY.BUTTON_BG,
      borderWidth: 1,
      borderColor: colors.ERROR_OVERLAY.BUTTON_BORDER,
    },
    summaryTypeBadge: {
      backgroundColor: colors.OVERLAY.SUMMARY,
      borderWidth: 1,
      borderColor: colors.BORDER.MEDIUM,
    },
    summaryTypeText: {
      color: colors.TEXT.PRIMARY,
    },
    summaryStatsCard: {
      backgroundColor: colors.OVERLAY.SUMMARY,
      borderWidth: 1,
      borderColor: colors.BORDER.MEDIUM,
    },
    summaryStatLabel: {
      color: colors.TEXT.QUATERNARY,
    },
    summaryStatValue: {
      color: colors.TEXT.PRIMARY,
    },
    summaryDiscardBtn: {
      backgroundColor: colors.ERROR_OVERLAY.BUTTON_BG,
      borderWidth: 1,
      borderColor: colors.ERROR_OVERLAY.BUTTON_BORDER,
    },
    summaryDiscardText: {
      color: colors.ERROR,
    },
    summarySaveBtn: {
      backgroundColor: colors.PRIMARY,
      shadowColor: colors.PRIMARY,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.4,
      shadowRadius: 8,
    },
    summarySaveText: {
      color: '#ffffff',
    },
    summaryShareBtn: {
      backgroundColor: colors.OVERLAY.SUMMARY,
      borderWidth: 1,
      borderColor: colors.BORDER.MEDIUM,
    },
    shareCard: {
      backgroundColor: colors.BACKGROUND,
    },
    shareCardDivider: {
      backgroundColor: colors.BORDER.LIGHT,
    },
    shareCardTypeText: {
      color: colors.TEXT.PRIMARY,
    },
    shareCardStatLabel: {
      color: colors.TEXT.QUATERNARY,
    },
    shareCardStatValue: {
      color: colors.TEXT.PRIMARY,
    },
    shareCardWatermark: {
      color: colors.TEXT.DISABLED,
    },
  });
}
