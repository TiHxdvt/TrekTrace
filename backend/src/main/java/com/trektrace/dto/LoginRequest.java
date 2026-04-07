package com.trektrace.dto;

import jak.validation.constraints.Pattern;
import lombok.Data;

public class LoginRequest {
    @Pattern(regexp = "^1[3-9]\\d{11}$")
    private String phone;
    
    @Pattern(regexp = "^\\d{6}$")
    private String code;
}
