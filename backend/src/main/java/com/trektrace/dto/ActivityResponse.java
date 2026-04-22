package com.trektrace.dto;

import lombok.Data;

@Data
public class ActivityResponse {
    private Long id;
    private String type;
    private String startTime;
    private String endTime;
    private Integer duration;
    private Double distance;
    private Double elevationGain;
    private String status;
    private String createdAt;
    private String weatherCondition;
    private Double temperature;
}
