package com.trektrace.dto;

import lombok.Data;

import java.util.ArrayList;
import java.util.List;

@Data
public class TrackValidationResult {
    private boolean valid = true;
    private List<String> errors = new ArrayList<>();
    private List<String> warnings = new ArrayList<>();

    public void addError(String error) {
        this.valid = false;
        this.errors.add(error);
    }

    public void addWarning(String warning) {
        this.warnings.add(warning);
    }
}
