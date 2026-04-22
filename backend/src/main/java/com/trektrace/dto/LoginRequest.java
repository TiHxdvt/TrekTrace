package com.trektrace.dto;

import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class LoginRequest {

    @Pattern(regexp = "^1[3-9]\\d{9}$")
    private String phone;

    @Pattern(regexp = "^\\d{6}$")
    private String code;

    @Size(min = 6, max = 72, message = "密码长度为6-72位")
    private String password;

    private String refreshToken;
}
