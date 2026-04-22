package com.trektrace.dto;

import lombok.Data;

import java.math.BigDecimal;
import java.util.Map;

@Data
public class StatsSummaryResponse {
    private int totalActivities;
    private BigDecimal totalDistance;
    private long totalDuration;
    private BigDecimal totalElevationGain;
    private int estimatedCalories;

    private Map<String, TypeSummary> byType;
    private int currentStreak;
    private int longestStreak;

    private Map<String, PersonalRecords> personalRecords;
    private BigDecimal weight;

    @Data
    public static class TypeSummary {
        private int count;
        private BigDecimal distance;
        private long duration;
        private int calories;
    }

    @Data
    public static class PersonalRecords {
        private RecordEntry longestDistance;
        private RecordEntry longestDuration;
        private RecordEntry highestElevation;
        private RecordEntry fastestPace; // only for RUNNING/CYCLING
    }

    @Data
    public static class RecordEntry {
        private BigDecimal value;
        private String date;

        public RecordEntry() {}

        public RecordEntry(BigDecimal value, String date) {
            this.value = value;
            this.date = date;
        }
    }

    @Data
    public static class TimePeriodSummary {
        private int activeDays;
        private int totalActivities;
        private BigDecimal totalDistance;    // 米
        private long totalDuration;          // 秒
        private BigDecimal totalElevationGain;
        private int totalCalories;
        private Map<String, TypeBreakdown> byType;
    }

    @Data
    public static class TypeBreakdown {
        private int count;
        private BigDecimal distance;
        private long duration;
    }
}
