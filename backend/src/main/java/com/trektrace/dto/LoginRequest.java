package com.trektrace.dto;

import jakarta.validation.constraints.Pattern;
import lombok.Data;

@Data
public class LoginRequest {
    
    @Pattern(regexp = "^1[3-9]\\d{11}$")
    private String phone;
    
    @Pattern(regexp = "^\\d{6}$")
    private String code;
}
