package com.trektrace.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class UpdateProfileRequest {
    @Size(max = 30, message = "昵称最长30个字符")
    private String nickname;

    @Size(max = 500, message = "头像URL最长500个字符")
    private String avatarUrl;

    @DecimalMin(value = "20", message = "体重不能低于20kg")
    @DecimalMax(value = "300", message = "体重不能超过300kg")
    private BigDecimal weight;

    @Size(max = 200, message = "个人简介最长200个字符")
    private String bio;

    @Pattern(regexp = "^(MALE|FEMALE|OTHER)?$", message = "性别值无效")
    private String gender;

    @DecimalMin(value = "50", message = "身高不能低于50cm")
    @DecimalMax(value = "300", message = "身高不能超过300cm")
    private BigDecimal height;
}
