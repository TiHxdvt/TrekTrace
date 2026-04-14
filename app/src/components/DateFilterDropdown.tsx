/**
 * 日期筛选下拉 — 胶囊按钮 + Modal 年月选择器（无遮罩，带阴影 + 本月快捷按钮）
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { COLORS, BORDER_RADIUS, TYPOGRAPHY, SPACING, SHADOWS } from '../theme';
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

  return (
    <>
      {/* 胶囊按钮 */}
      <Pressable style={styles.btn} onPress={openModal}>
        <IconCalendar size={16} color={COLORS.TEXT.PRIMARY} />
        <Text style={styles.label}>
          {year}年 {month}月
        </Text>
        <IconArrowDown size={14} color={COLORS.TEXT.TERTIARY} />
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
          <Pressable style={styles.card} onPress={e => e.stopPropagation()}>
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
                      y === draftYear && styles.optionSelected,
                    ]}
                    onPress={() => setDraftYear(y)}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        y === draftYear && styles.optionTextSelected,
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
                      m === draftMonth && styles.optionSelected,
                    ]}
                    onPress={() => setDraftMonth(m)}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        m === draftMonth && styles.optionTextSelected,
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
              <Pressable style={styles.thisMonthBtn} onPress={goThisMonth}>
                <Text style={styles.thisMonthText}>本月</Text>
              </Pressable>
              <Pressable style={styles.confirmBtn} onPress={confirm}>
                <Text style={styles.confirmText}>确定</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  /* ---------- 胶囊按钮 ---------- */
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.XS,
    paddingVertical: SPACING.XS + 2,
    paddingHorizontal: SPACING.MD,
    backgroundColor: COLORS.OVERLAY.LIGHT,
    borderWidth: 1,
    borderColor: COLORS.BORDER.LIGHT,
    borderRadius: BORDER_RADIUS.FULL,
  },
  label: {
    fontSize: TYPOGRAPHY.FONT_SIZE.SM,
    fontWeight: '600',
    color: COLORS.TEXT.PRIMARY,
  },

  /* ---------- Modal ---------- */
  touchableArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    width: 280,
    maxHeight: 420,
    backgroundColor: 'rgba(28, 30, 38, 0.95)',
    borderRadius: BORDER_RADIUS.G2.LG,
    borderWidth: 1,
    borderColor: COLORS.BORDER.MEDIUM,
    padding: SPACING.LG,
    ...SHADOWS.LARGE,
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
  optionSelected: {
    backgroundColor: COLORS.PRIMARY,
  },
  optionText: {
    fontSize: TYPOGRAPHY.FONT_SIZE.BASE,
    color: COLORS.TEXT.SECONDARY,
  },
  optionTextSelected: {
    color: COLORS.TEXT.PRIMARY,
    fontWeight: '600',
  },

  /* ---------- 底部按钮行 ---------- */
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: SPACING.MD,
  },
  thisMonthBtn: {
    paddingVertical: SPACING.SM + 2,
    paddingHorizontal: SPACING.LG,
    borderRadius: BORDER_RADIUS.MD,
    backgroundColor: COLORS.OVERLAY.MEDIUM,
  },
  thisMonthText: {
    fontSize: TYPOGRAPHY.FONT_SIZE.BASE,
    fontWeight: '600',
    color: COLORS.TEXT.SECONDARY,
  },
  confirmBtn: {
    paddingVertical: SPACING.SM + 2,
    paddingHorizontal: SPACING.XL,
    borderRadius: BORDER_RADIUS.MD,
    backgroundColor: COLORS.PRIMARY,
  },
  confirmText: {
    fontSize: TYPOGRAPHY.FONT_SIZE.BASE,
    fontWeight: '600',
    color: COLORS.TEXT.PRIMARY,
  },
});
