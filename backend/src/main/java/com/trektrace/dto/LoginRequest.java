package com.trektrace.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class LoginRequest {

    @NotBlank(message = "账号不能为空")
    private String identifier;

    @NotBlank(message = "密码不能为空")
    @Size(min = 6, max = 72, message = "密码长度为6-72位")
    private String password;

    private String refreshToken;
}
