package com.trektrace.dto;

import jakarta.validation.constraints.Pattern;
import lombok.Data;

@Data
public class SetPasswordRequest {

    @Pattern(regexp = "^(?=.*[A-Za-z])(?=.*\\d)[A-Za-z\\d@$!%*#?&]{6,72}$",
            message = "密码需6-72位，且包含字母和数字")
    private String password;
}
