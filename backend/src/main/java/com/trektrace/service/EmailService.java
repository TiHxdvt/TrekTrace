package com.trektrace.service;

import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Service
public class EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailService.class);

    @Value("${mail.provider:mock}")
    private String provider;

    @Value("${mail.base-url:http://localhost:8080}")
    private String baseUrl;

    @Value("${mail.from:noreply@trektrace.com}")
    private String from;

    private final ObjectProvider<JavaMailSender> mailSenderProvider;

    public EmailService(ObjectProvider<JavaMailSender> mailSenderProvider) {
        this.mailSenderProvider = mailSenderProvider;
    }

    public void sendVerificationEmail(String to, String token) {
        String verificationUrl = baseUrl + "/api/auth/verify-email?token=" + token;

        if ("mock".equals(provider)) {
            log.info("===== Mock Email =====");
            log.info("To: {}", to);
            log.info("Subject: 途迹 TrekTrace - 邮箱验证");
            log.info("Body: 请点击以下链接验证你的邮箱：\n{}\n\n链接有效期为24小时。", verificationUrl);
            log.info("======================");
            return;
        }

        JavaMailSender mailSender = mailSenderProvider.getIfAvailable();
        if (mailSender == null) {
            log.warn("JavaMailSender not available, skipping email to {}", to);
            return;
        }

        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(from);
        message.setTo(to);
        message.setSubject("途迹 TrekTrace - 邮箱验证");
        message.setText("请点击以下链接验证你的邮箱：\n\n" + verificationUrl + "\n\n链接有效期为24小时。");
        mailSender.send(message);
    }
}
