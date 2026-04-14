package com.trektrace.dto;

import lombok.Data;

@Data
public class ChangePhoneRequest {
    private String phone;
    private String code;
}
