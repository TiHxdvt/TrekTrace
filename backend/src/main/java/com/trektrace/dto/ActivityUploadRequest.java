package com.trektrace.dto;

import jakarta.validation.constraints.*;
import lombok.Data;

import java.util.List;

@Data
public class ActivityUploadRequest {
    @NotBlank(message = "type is required")
    @Pattern(regexp = "^(HIKING|RUNNING|CYCLING)$", message = "type must be HIKING, RUNNING, or CYCLING")
    private String type;

    @NotBlank(message = "startTime is required")
    private String startTime;

    @NotBlank(message = "endTime is required")
    private String endTime;

    @NotNull(message = "duration is required")
    @Min(value = 0, message = "duration must be non-negative")
    private Integer duration;

    @NotNull(message = "distance is required")
    @DecimalMin(value = "0.0", message = "distance must be non-negative")
    private Double distance;

    @DecimalMin(value = "0.0", message = "elevationGain must be non-negative")
    private Double elevationGain;

    @NotNull(message = "trackPoints is required")
    private List<TrackPointDTO> trackPoints;

    private String weatherCondition;
    private Double temperature;
}
