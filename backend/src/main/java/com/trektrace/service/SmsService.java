package com.trektrace.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class SmsService {

    @Value("${sms.provider:mock}")
    private String provider;

    public void sendVerificationCode(String phone, String code) {
        // 开发环境:打印验证码到控制台
        System.out.println("【SMS Mock】 发送验证码到 " + phone + ", code: " + code);
    }

    public boolean isMock() {
        return "mock".equals(provider);
    }
}
