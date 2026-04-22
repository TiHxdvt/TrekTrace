package com.trektrace.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

@Data
public class CreateActivityRequest {
    @NotBlank(message = "type is required")
    @Pattern(regexp = "^(HIKING|RUNNING|CYCLING)$", message = "type must be HIKING, RUNNING, or CYCLING")
    private String type;

    @NotBlank(message = "startTime is required")
    private String startTime;
}
