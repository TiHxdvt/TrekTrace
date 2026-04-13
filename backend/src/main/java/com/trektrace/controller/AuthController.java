package com.trektrace.controller;

import com.trektrace.dto.LoginRequest;
import com.trektrace.dto.LoginResponse;
import com.trektrace.entity.User;
import com.trektrace.entity.VerificationCode;
import com.trektrace.service.UserService;
import com.trektrace.service.SmsService;
import com.trektrace.repository.VerificationCodeRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    // Simple in-memory rate limiter: phone -> last send timestamp
    private final Map<String, Long> rateLimitMap = new ConcurrentHashMap<>();
    private static final long RATE_LIMIT_MS = 60_000; // 1 minute between sends

    @Autowired
    private UserService userService;

    @Autowired
    private SmsService smsService;

    @Autowired
    private VerificationCodeRepository verificationCodeRepository;

    @PostMapping("/send-code")
    public ResponseEntity<?> sendVerificationCode(@RequestBody LoginRequest request) {
        String phone = request.getPhone();

        // Validate phone format
        if (phone == null || !phone.matches("^1[3-9]\\d{9}$")) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        }

        // Rate limit: 1 request per minute per phone
        long now = System.currentTimeMillis();
        Long lastSent = rateLimitMap.get(phone);
        if (lastSent != null && (now - lastSent) < RATE_LIMIT_MS) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS).build();
        }
        rateLimitMap.put(phone, now);

        // Periodically clean up old entries to prevent memory leak
        if (rateLimitMap.size() > 10000) {
            rateLimitMap.entrySet().removeIf(e -> (now - e.getValue()) > RATE_LIMIT_MS);
        }

        // Generate and save verification code
        String code = String.format("%06d", new java.security.SecureRandom().nextInt(1000000));
        VerificationCode vc = new VerificationCode();
        vc.setPhone(phone);
        vc.setCode(code);
        vc.setExpiresAt(LocalDateTime.now().plusMinutes(5));
        vc.setUsed(false);

        verificationCodeRepository.save(vc);

        // Send verification code
        smsService.sendVerificationCode(phone, code);

        if (smsService.isMock()) {
            return ResponseEntity.ok(Map.of("code", code));
        }
        return ResponseEntity.ok().build();
    }

    @PostMapping("/login")
    @Transactional
    public ResponseEntity<?> login(@RequestBody LoginRequest request) {
        String phone = request.getPhone();
        String code = request.getCode();

        // Validate verification code
        Optional<VerificationCode> vcOpt = verificationCodeRepository
            .findTopByPhoneAndCodeAndUsedFalseOrderByCreatedAtDesc(phone, code);

        if (vcOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(Map.of("error", "验证码错误或已过期"));
        }

        VerificationCode vc = vcOpt.get();
        if (vc.getExpiresAt().isBefore(LocalDateTime.now())) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(Map.of("error", "验证码已过期"));
        }

        // Mark code as used immediately to prevent reuse
        vc.setUsed(true);
        verificationCodeRepository.save(vc);

        // Login or create user
        User user = userService.createOrGetUser(phone);

        // Generate token
        String token = userService.generateToken(user.getId());

        return ResponseEntity.ok(new LoginResponse(token, user));
    }
}
