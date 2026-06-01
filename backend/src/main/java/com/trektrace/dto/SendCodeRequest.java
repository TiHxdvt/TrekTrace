package com.trektrace.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

@Data
public class SendCodeRequest {

    @NotBlank(message = "账号不能为空")
    private String identifier;

    /** register / resetPassword / bind */
    @NotBlank(message = "用途不能为空")
    @Pattern(regexp = "^(register|resetPassword|bind)$", message = "用途参数无效")
    private String purpose;
}
