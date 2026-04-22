package com.trektrace.controller;

import com.trektrace.dto.BindEmailRequest;
import com.trektrace.dto.LoginRequest;
import com.trektrace.dto.LoginResponse;
import com.trektrace.dto.ResetPasswordRequest;
import com.trektrace.entity.EmailVerificationToken;
import com.trektrace.entity.User;
import com.trektrace.entity.VerificationCode;
import com.trektrace.repository.EmailVerificationTokenRepository;
import com.trektrace.repository.UserRepository;
import com.trektrace.service.EmailService;
import com.trektrace.service.TokenBlacklistService;
import com.trektrace.service.UserService;
import com.trektrace.service.SmsService;
import com.trektrace.repository.VerificationCodeRepository;
import com.trektrace.util.JwtUtil;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    // Simple in-memory rate limiter: phone -> last send timestamp
    private final Map<String, Long> rateLimitMap = new ConcurrentHashMap<>();
    private static final long RATE_LIMIT_MS = 60_000; // 1 minute between sends

    // Login attempt rate limiter: key -> [count, timestamp]
    private final Map<String, long[]> loginAttemptMap = new ConcurrentHashMap<>();
    private static final int MAX_LOGIN_ATTEMPTS = 5;
    private static final long LOGIN_LOCKOUT_MS = 15 * 60_000; // 15 minutes lockout

    private final UserService userService;
    private final SmsService smsService;
    private final VerificationCodeRepository verificationCodeRepository;
    private final TokenBlacklistService tokenBlacklistService;
    private final EmailService emailService;
    private final EmailVerificationTokenRepository emailVerificationTokenRepository;
    private final UserRepository userRepository;
    private final JwtUtil jwtUtil;

    public AuthController(UserService userService,
                          SmsService smsService,
                          VerificationCodeRepository verificationCodeRepository,
                          TokenBlacklistService tokenBlacklistService,
                          EmailService emailService,
                          EmailVerificationTokenRepository emailVerificationTokenRepository,
                          UserRepository userRepository,
                          JwtUtil jwtUtil) {
        this.userService = userService;
        this.smsService = smsService;
        this.verificationCodeRepository = verificationCodeRepository;
        this.tokenBlacklistService = tokenBlacklistService;
        this.emailService = emailService;
        this.emailVerificationTokenRepository = emailVerificationTokenRepository;
        this.userRepository = userRepository;
        this.jwtUtil = jwtUtil;
    }

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
        if (loginAttemptMap.size() > 10000) {
            loginAttemptMap.entrySet().removeIf(e -> (now - e.getValue()[1]) > LOGIN_LOCKOUT_MS);
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

        return ResponseEntity.ok().build();
    }

    @PostMapping("/login")
    @Transactional
    public ResponseEntity<?> login(@RequestBody LoginRequest request) {
        String phone = request.getPhone();
        String code = request.getCode();

        // Atomically consume the verification code to prevent TOCTOU race condition
        int consumed = verificationCodeRepository.consumeCode(phone, code, LocalDateTime.now());

        if (consumed == 0) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(Map.of("error", "验证码错误或已过期"));
        }

        // Login or create user
        User user = userService.createOrGetUser(phone);

        // Generate token pair
        String token = userService.generateToken(user.getId());
        String refreshToken = userService.generateRefreshToken(user.getId());

        return ResponseEntity.ok(new LoginResponse(token, refreshToken, user));
    }

    @PostMapping("/login-password")
    public ResponseEntity<?> loginWithPassword(@RequestBody LoginRequest request) {
        String phone = request.getPhone();
        String password = request.getPassword();

        if (phone == null || password == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", "手机号和密码不能为空"));
        }

        // Login attempt rate limiting
        String rateKey = "pwd:" + phone;
        long now = System.currentTimeMillis();
        long[] attempt = loginAttemptMap.get(rateKey);
        if (attempt != null) {
            long elapsed = now - attempt[1];
            if (elapsed < LOGIN_LOCKOUT_MS && attempt[0] >= MAX_LOGIN_ATTEMPTS) {
                return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                        .body(Map.of("error", "登录尝试过多，请15分钟后重试"));
            }
            if (elapsed >= LOGIN_LOCKOUT_MS) {
                loginAttemptMap.remove(rateKey);
            }
        }

        try {
            User user = userService.authenticatePassword(phone, password);
            loginAttemptMap.remove(rateKey);
            String token = userService.generateToken(user.getId());
            String refreshToken = userService.generateRefreshToken(user.getId());
            return ResponseEntity.ok(new LoginResponse(token, refreshToken, user));
        } catch (Exception e) {
            loginAttemptMap.compute(rateKey, (k, v) -> {
                if (v == null || (now - v[1]) >= LOGIN_LOCKOUT_MS) {
                    return new long[]{1, now};
                }
                v[0]++;
                return v;
            });
            throw e;
        }
    }

    @PostMapping("/refresh")
    public ResponseEntity<?> refreshToken(@RequestBody LoginRequest request) {
        String refreshToken = request.getRefreshToken();

        if (refreshToken == null || refreshToken.isBlank()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", "refreshToken不能为空"));
        }

        // Validate refresh token
        if (!jwtUtil.validateToken(refreshToken)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "无效的refreshToken"));
        }

        // Must be a refresh token type
        if (!jwtUtil.isRefreshToken(refreshToken)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "token类型错误"));
        }

        // Check if already blacklisted
        String jti = jwtUtil.getTokenId(refreshToken);
        if (jti != null && tokenBlacklistService.isBlacklisted(jti)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "refreshToken已失效"));
        }

        Long userId = jwtUtil.getUserIdFromToken(refreshToken);
        if (userId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "无效的refreshToken"));
        }

        // Blacklist old refresh token (rotation)
        tokenBlacklistService.blacklistToken(refreshToken);

        // Generate new token pair
        String newAccessToken = userService.generateToken(userId);
        String newRefreshToken = userService.generateRefreshToken(userId);

        User user = userService.getUserById(userId);
        return ResponseEntity.ok(new LoginResponse(newAccessToken, newRefreshToken, user));
    }

    @PostMapping("/reset-password")
    @Transactional
    public ResponseEntity<?> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        try {
            userService.resetPassword(request.getPhone(), request.getCode(), request.getNewPassword());
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            if (e instanceof org.springframework.web.server.ResponseStatusException rse) {
                return ResponseEntity.status(rse.getStatusCode())
                        .body(Map.of("error", rse.getReason()));
            }
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "重置密码失败"));
        }
    }

    @PostMapping("/bind-email")
    public ResponseEntity<?> bindEmail(@Valid @RequestBody BindEmailRequest request,
                                       Authentication authentication) {
        if (authentication == null || authentication.getPrincipal() == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "未登录"));
        }
        Long userId = (Long) authentication.getPrincipal();

        userService.bindEmail(userId, request.getEmail());

        // Generate email verification token
        String token = UUID.randomUUID().toString();
        EmailVerificationToken evt = new EmailVerificationToken();
        evt.setUser(userRepository.getReferenceById(userId));
        evt.setEmail(request.getEmail());
        evt.setToken(token);
        evt.setExpiresAt(LocalDateTime.now().plusHours(24));
        evt.setUsed(false);
        emailVerificationTokenRepository.save(evt);

        // Send verification email
        emailService.sendVerificationEmail(request.getEmail(), token);

        return ResponseEntity.ok().build();
    }

    @GetMapping("/verify-email")
    public ResponseEntity<?> verifyEmail(@RequestParam String token) {
        Optional<EmailVerificationToken> evtOpt = emailVerificationTokenRepository
                .findByTokenAndUsedFalseAndExpiresAtAfter(token, LocalDateTime.now());

        if (evtOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", "验证链接无效或已过期"));
        }

        EmailVerificationToken evt = evtOpt.get();
        evt.setUsed(true);
        emailVerificationTokenRepository.save(evt);

        userService.verifyEmail(evt.getUser().getId(), evt.getEmail());

        return ResponseEntity.ok(Map.of("message", "邮箱验证成功"));
    }
}
