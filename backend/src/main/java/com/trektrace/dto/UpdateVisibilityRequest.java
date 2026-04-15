package com.trektrace.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

@Data
public class UpdateVisibilityRequest {
    @NotBlank(message = "可见性设置不能为空")
    @Pattern(regexp = "PUBLIC|FRIENDS|PRIVATE", message = "无效的可见性设置")
    private String visibility;
}
