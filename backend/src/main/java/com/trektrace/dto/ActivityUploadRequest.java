package com.trektrace.dto;

import lombok.Data;

import java.util.List;

@Data
public class ActivityUploadRequest {
    private String type;
    private String startTime;
    private String endTime;
    private Integer duration;
    private Double distance;
    private Double elevationGain;
    private List<TrackPointDTO> trackPoints;
}
