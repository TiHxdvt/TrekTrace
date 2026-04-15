package com.trektrace.dto;

import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class UpdateProfileRequest {
    @Size(max = 14, message = "昵称最长14个字符")
    private String nickname;

    @Size(max = 500, message = "头像URL最长500个字符")
    private String avatarUrl;
}
