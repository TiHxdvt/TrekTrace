package com.trektrace.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import lombok.Data;

import java.util.List;

@Data
public class CreateGroupRequest {
    @NotBlank(message = "群名不能为空")
    private String name;

    @NotEmpty(message = "成员列表不能为空")
    private List<Long> memberIds;
}
