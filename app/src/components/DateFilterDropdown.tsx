/**
 * 日期筛选下拉 — 胶囊按钮 + Modal 年月选择器（无遮罩，带阴影 + 本月快捷按钮）
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { BORDER_RADIUS, TYPOGRAPHY, SPACING, SHADOWS } from '../theme';
import { useTheme } from '../contexts/ThemeContext';
import { IconCalendar, IconArrowDown } from './SolarIcons';

interface DateFilterDropdownProps {
  year: number;
  month: number; // 1-12
  onChange: (year: number, month: number) => void;
  /** 可选最早年份，默认 2020 */
  minYear?: number;
  /** 可选最晚年份，默认当前年 */
  maxYear?: number;
}

const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);

export const DateFilterDropdown: React.FC<DateFilterDropdownProps> = ({
  year,
  month,
  onChange,
  minYear = 2020,
  maxYear = new Date().getFullYear(),
}) => {
  const { colors } = useTheme();
  const [visible, setVisible] = useState(false);
  const [draftYear, setDraftYear] = useState(year);
  const [draftMonth, setDraftMonth] = useState(month);

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  const years = Array.from(
    { length: maxYear - minYear + 1 },
    (_, i) => minYear + i,
  );

  const openModal = () => {
    setDraftYear(year);
    setDraftMonth(month);
    setVisible(true);
  };

  const confirm = () => {
    onChange(draftYear, draftMonth);
    setVisible(false);
  };

  const goThisMonth = () => {
    setDraftYear(currentYear);
    setDraftMonth(currentMonth);
  };

  const dynamicStyles = useMemo(() => StyleSheet.create({
    btn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.XS,
      paddingVertical: SPACING.XS + 2,
      paddingHorizontal: SPACING.MD,
      backgroundColor: colors.OVERLAY.LIGHT,
      borderWidth: 1,
      borderColor: colors.BORDER.LIGHT,
      borderRadius: BORDER_RADIUS.FULL,
    },
    label: {
      fontSize: TYPOGRAPHY.FONT_SIZE.SM,
      fontWeight: '600',
      color: colors.TEXT.PRIMARY,
    },
    card: {
      width: 280,
      maxHeight: 420,
      backgroundColor: colors.OVERLAY.SUMMARY,
      borderRadius: BORDER_RADIUS.G2.LG,
      borderWidth: 1,
      borderColor: colors.BORDER.MEDIUM,
      padding: SPACING.LG,
      ...SHADOWS.LARGE,
    },
    optionSelected: {
      backgroundColor: colors.PRIMARY,
    },
    optionText: {
      fontSize: TYPOGRAPHY.FONT_SIZE.BASE,
      color: colors.TEXT.SECONDARY,
    },
    optionTextSelected: {
      color: colors.TEXT.PRIMARY,
      fontWeight: '600',
    },
    thisMonthBtn: {
      paddingVertical: SPACING.SM + 2,
      paddingHorizontal: SPACING.LG,
      borderRadius: BORDER_RADIUS.MD,
      backgroundColor: colors.OVERLAY.MEDIUM,
    },
    thisMonthText: {
      fontSize: TYPOGRAPHY.FONT_SIZE.BASE,
      fontWeight: '600',
      color: colors.TEXT.SECONDARY,
    },
    confirmBtn: {
      paddingVertical: SPACING.SM + 2,
      paddingHorizontal: SPACING.XL,
      borderRadius: BORDER_RADIUS.MD,
      backgroundColor: colors.PRIMARY,
    },
    confirmText: {
      fontSize: TYPOGRAPHY.FONT_SIZE.BASE,
      fontWeight: '600',
      color: colors.TEXT.PRIMARY,
    },
  }), [colors]);

  return (
    <>
      {/* 胶囊按钮 */}
      <Pressable style={dynamicStyles.btn} onPress={openModal}>
        <IconCalendar size={16} color={colors.TEXT.PRIMARY} />
        <Text style={dynamicStyles.label}>
          {year}年 {month}月
        </Text>
        <IconArrowDown size={14} color={colors.TEXT.TERTIARY} />
      </Pressable>

      {/* 下拉选择器 Modal — 无遮罩 */}
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={() => setVisible(false)}
      >
        <Pressable
          style={styles.touchableArea}
          onPress={() => setVisible(false)}
        >
          <Pressable style={dynamicStyles.card} onPress={e => e.stopPropagation()}>
            {/* 年月滚动选择 */}
            <View style={styles.pickerRow}>
              {/* 年份列 */}
              <ScrollView
                style={styles.column}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.columnContent}
              >
                {years.map(y => (
                  <Pressable
                    key={y}
                    style={[
                      styles.option,
                      y === draftYear && dynamicStyles.optionSelected,
                    ]}
                    onPress={() => setDraftYear(y)}
                  >
                    <Text
                      style={[
                        dynamicStyles.optionText,
                        y === draftYear && dynamicStyles.optionTextSelected,
                      ]}
                    >
                      {y}年
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>

              {/* 月份列 */}
              <ScrollView
                style={styles.column}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.columnContent}
              >
                {MONTHS.map(m => (
                  <Pressable
                    key={m}
                    style={[
                      styles.option,
                      m === draftMonth && dynamicStyles.optionSelected,
                    ]}
                    onPress={() => setDraftMonth(m)}
                  >
                    <Text
                      style={[
                        dynamicStyles.optionText,
                        m === draftMonth && dynamicStyles.optionTextSelected,
                      ]}
                    >
                      {m}月
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>

            {/* 底部：左侧「本月」+ 右侧「确定」 */}
            <View style={styles.footerRow}>
              <Pressable style={dynamicStyles.thisMonthBtn} onPress={goThisMonth}>
                <Text style={dynamicStyles.thisMonthText}>本月</Text>
              </Pressable>
              <Pressable style={dynamicStyles.confirmBtn} onPress={confirm}>
                <Text style={dynamicStyles.confirmText}>确定</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  /* ---------- Modal ---------- */
  touchableArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerRow: {
    flexDirection: 'row',
    gap: SPACING.SM,
    maxHeight: 300,
  },
  column: {
    flex: 1,
  },
  columnContent: {
    paddingVertical: SPACING.XS,
  },
  option: {
    paddingVertical: SPACING.SM,
    paddingHorizontal: SPACING.MD,
    borderRadius: BORDER_RADIUS.SM,
    alignItems: 'center',
  },

  /* ---------- 底部按钮行 ---------- */
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: SPACING.MD,
  },
});
