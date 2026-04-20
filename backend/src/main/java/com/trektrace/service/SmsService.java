package com.trektrace.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class SmsService {

    private static final Logger log = LoggerFactory.getLogger(SmsService.class);

    @Value("${sms.provider:mock}")
    private String provider;

    public void sendVerificationCode(String phone, String code) {
        // 开发环境: 仅打印脱敏手机号和验证码到日志
        String masked = phone.length() >= 4
                ? phone.substring(0, 3) + "****" + phone.substring(phone.length() - 4)
                : "***";
        log.info("【SMS Mock】 发送验证码到 {}, code: {}", masked, code);
    }

    public boolean isMock() {
        return "mock".equals(provider);
    }
}
