package com.trektrace.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class SmsService {
    
    @Value("${sms.provider:mock}")
    private String provider;
    
    public void sendVerificationCode(String phone) {
        String code = generateCode();
        System.out.println("【SMS Mock】 发送验证码到 " + phone + ", code: " + code);
    }
    
    private String generateCode() {
        return String.format("%06d", new java.util.Random().nextInt(1000000));
    }
}
