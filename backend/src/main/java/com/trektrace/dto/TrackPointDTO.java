package com.trektrace.dto;

import lombok.Data;

@Data
public class TrackPointDTO {
    private Double latitude;
    private Double longitude;
    private Double altitude;
    private Double speed;
    private String timestamp;
}
