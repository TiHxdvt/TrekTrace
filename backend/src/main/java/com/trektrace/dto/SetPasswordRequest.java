package com.trektrace.dto;

import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class SetPasswordRequest {

    @Size(min = 6, max = 72, message = "密码长度为6-72位")
    private String password;
}
