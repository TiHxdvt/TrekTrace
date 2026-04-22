/**
 * ActivityScreen 静态样式（不依赖主题色的部分）
 */

import { StyleSheet, Dimensions } from 'react-native';
import { BORDER_RADIUS, TYPOGRAPHY } from '../../theme';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // Glow
  ambientGlow: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    zIndex: 0,
  },
  glowOrb: { position: 'absolute', borderRadius: 9999 },
  glowOrbTop: {
    top: -80, right: -40, width: 300, height: 300,
  },
  glowOrbCenter: {
    top: '40%', left: '50%', transform: [{ translateX: -150 }],
    width: 400, height: 400,
  },
  glowOrbBottom: {
    bottom: -80, left: -60, width: 500, height: 500,
  },
  fullScreenBlur: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },

  // Header
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 12,
    zIndex: 20,
  },
  headerIconButton: {
    width: 40, height: 40, borderRadius: 20,
    justifyContent: 'center', alignItems: 'center',
  },
  searchBar: {
    flex: 1, height: 40,
    borderRadius: 20,
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, gap: 12,
  },
  searchPlaceholder: {
    fontSize: TYPOGRAPHY.FONT_SIZE.MD,
  },

  // Map Card
  mapCard: {
    flex: 1,
    marginHorizontal: 20,
    marginBottom: 120,
    borderRadius: BORDER_RADIUS.G2.LG,
    overflow: 'hidden',
    zIndex: 10,
  },

  // GPS Status Indicator
  mapGpsStatusWrapper: {
    position: 'absolute', top: 16, left: 16,
    width: 36, height: 36, borderRadius: 18,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Locate Button
  mapLocateWrapper: {
    position: 'absolute', bottom: 105 + 12, right: 12,
    width: 36, height: 36, borderRadius: 18,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapLocateDisabled: {
    opacity: 0.4,
  },

  // Mock GPS Button
  mapSimWrapper: {
    position: 'absolute', bottom: 105 + 12, left: 12,
    width: 36, height: 36, borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapSimActive: {
  },
  simText: {
    fontSize: TYPOGRAPHY.FONT_SIZE.XS,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  simTextActive: {
  },

  // ========== Control Panel ==========
  panelWrapper: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
  },
  panelContent: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },

  // 一行数据
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  statDivider: {
    width: 1,
    height: 20,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: TYPOGRAPHY.FONT_SIZE.XS,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: '600',
    marginBottom: 1,
  },
  statValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  statValue: {
    fontSize: TYPOGRAPHY.FONT_SIZE.MD,
    fontWeight: '600',
  },
  statValueDim: {
  },
  statUnit: {
    fontSize: TYPOGRAPHY.FONT_SIZE.XS,
    fontWeight: '400',
    marginLeft: 2,
  },

  // 中间双按钮
  centerButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
  },
  actionBtn: {
    width: 44, height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },

  idleBtnBg: {
    borderWidth: 1,
  },
  resumeBtnBg: {
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },

  startBtnBg: {
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
  },
  stopBtnBg: {
    borderWidth: 1,
    overflow: 'hidden',
  },
  stopBtnInner: {
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    height: '100%',
  },
  stopProgressRingContainer: {
    position: 'absolute',
    top: -1,
    left: -1,
    width: 44,
    height: 44,
  },

  // ========== Summary Overlay ==========
  mapCardSummary: {
    marginHorizontal: 0,
    marginBottom: 0,
    borderRadius: 0,
  },
  summaryStatsOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    gap: 12,
  },
  summaryTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: 8,
    borderRadius: BORDER_RADIUS.G2.XXL,
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  summaryTypeText: {
    fontSize: TYPOGRAPHY.FONT_SIZE.MD,
    fontWeight: '600',
  },
  summaryStatsCard: {
    borderRadius: BORDER_RADIUS.G2.LG,
    borderWidth: 1,
    padding: 16,
  },
  summaryStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  summaryStatItem: {
    alignItems: 'center',
  },
  summaryStatLabel: {
    fontSize: TYPOGRAPHY.FONT_SIZE.XS,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: '600',
    marginBottom: 4,
  },
  summaryStatValue: {
    fontSize: TYPOGRAPHY.FONT_SIZE.MD,
    fontWeight: '600',
  },
  summaryBottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 40,
    paddingTop: 16,
  },
  summaryButtonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  summaryDiscardBtn: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  summaryDiscardText: {
    fontSize: TYPOGRAPHY.FONT_SIZE.MD,
    fontWeight: '600',
  },
  summarySaveBtn: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  summarySaveText: {
    fontSize: TYPOGRAPHY.FONT_SIZE.MD,
    fontWeight: '600',
  },
  summaryShareBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },

  // ========== Share Card ==========
  shareCard: {
    position: 'absolute',
    left: 0,
    top: -9999,
    width: Dimensions.get('window').width,
    height: Math.round(Dimensions.get('window').width * 1.3),
    borderRadius: BORDER_RADIUS.G2.LG,
    overflow: 'hidden',
  },
  shareCardTrackArea: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shareCardDivider: {
    height: 1,
    marginHorizontal: 24,
  },
  shareCardDataArea: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    gap: 12,
  },
  shareCardTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  shareCardTypeText: {
    fontSize: TYPOGRAPHY.FONT_SIZE.MD,
    fontWeight: '600',
  },
  shareCardStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  shareCardStatItem: {
    alignItems: 'center',
  },
  shareCardStatLabel: {
    fontSize: TYPOGRAPHY.FONT_SIZE.XS,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  shareCardStatValue: {
    fontSize: TYPOGRAPHY.FONT_SIZE.MD,
    fontWeight: '600',
  },
  shareCardWatermark: {
    textAlign: 'right',
    fontSize: TYPOGRAPHY.FONT_SIZE.XS,
    fontWeight: '600',
    letterSpacing: 1,
  },
});
