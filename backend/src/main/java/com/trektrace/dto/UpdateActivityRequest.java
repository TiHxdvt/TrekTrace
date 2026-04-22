package com.trektrace.dto;

import lombok.Data;

import java.util.List;

@Data
public class UpdateActivityRequest {
    private String status;
    private String endTime;
    private Integer duration;
    private Double distance;
    private Double elevationGain;
    private List<TrackPointDTO> newTrackPoints;
}
