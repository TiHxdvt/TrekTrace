package com.trektrace.dto;

import lombok.Data;

@Data
public class DataSummaryResponse {
    private long totalActivities;
    private double totalDistance;
    private long totalDuration;    // seconds
    private double totalElevationGain;
}
