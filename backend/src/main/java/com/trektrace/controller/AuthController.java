package com.trektrace.controller;

import com.trektrace.dto.BindEmailRequest;
import com.trektrace.dto.LoginRequest;
import com.trektrace.dto.LoginResponse;
import com.trektrace.dto.RefreshTokenRequest;
import com.trektrace.dto.RegisterRequest;
import com.trektrace.dto.ResetPasswordRequest;
import com.trektrace.dto.SendCodeRequest;
import com.trektrace.dto.VerifyCodeRequest;
import com.trektrace.entity.User;
import com.trektrace.entity.VerificationCode;
import com.trektrace.service.EmailService;
import com.trektrace.service.TokenBlacklistService;
import com.trektrace.service.UserService;
import com.trektrace.service.SmsService;
import com.trektrace.repository.UserRepository;
import com.trektrace.repository.VerificationCodeRepository;
import com.trektrace.util.JwtUtil;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private static final Logger log = LoggerFactory.getLogger(AuthController.class);

    // Simple in-memory rate limiter: target -> last send timestamp
    private final Map<String, Long> rateLimitMap = new ConcurrentHashMap<>();
    private static final long RATE_LIMIT_MS = 60_000; // 1 minute between sends

    // Login attempt rate limiter: key -> [count, timestamp]
    private final Map<String, long[]> loginAttemptMap = new ConcurrentHashMap<>();
    private static final int MAX_LOGIN_ATTEMPTS = 5;
    private static final long LOGIN_LOCKOUT_MS = 15 * 60_000; // 15 minutes lockout

    private final UserService userService;
    private final UserRepository userRepository;
    private final SmsService smsService;
    private final VerificationCodeRepository verificationCodeRepository;
    private final TokenBlacklistService tokenBlacklistService;
    private final EmailService emailService;
    private final JwtUtil jwtUtil;

    public AuthController(UserService userService,
                          UserRepository userRepository,
                          SmsService smsService,
                          VerificationCodeRepository verificationCodeRepository,
                          TokenBlacklistService tokenBlacklistService,
                          EmailService emailService,
                          JwtUtil jwtUtil) {
        this.userService = userService;
        this.userRepository = userRepository;
        this.smsService = smsService;
        this.verificationCodeRepository = verificationCodeRepository;
        this.tokenBlacklistService = tokenBlacklistService;
        this.emailService = emailService;
        this.jwtUtil = jwtUtil;
    }

    @PostMapping("/send-code")
    public ResponseEntity<?> sendVerificationCode(@Valid @RequestBody SendCodeRequest request) {
        String identifier = request.getIdentifier();

        // Validate format: must be email or phone
        if (!UserService.isEmail(identifier) && !UserService.isPhone(identifier)) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", "请输入正确的邮箱或手机号"));
        }

        // Check account existence based on purpose
        boolean exists = userRepository.findByIdentifier(identifier).isPresent();
        String purpose = request.getPurpose();
        if ("register".equals(purpose) && exists) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(Map.of("error", "该账号已注册，请直接登录"));
        }
        if ("resetPassword".equals(purpose) && !exists) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", "该账号未注册"));
        }

        // Rate limit: 1 request per minute per target
        long now = System.currentTimeMillis();
        Long lastSent = rateLimitMap.get(identifier);
        if (lastSent != null && (now - lastSent) < RATE_LIMIT_MS) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS).build();
        }
        rateLimitMap.put(identifier, now);

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
        vc.setTarget(identifier);
        vc.setCode(code);
        vc.setExpiresAt(LocalDateTime.now().plusMinutes(5));
        vc.setUsed(false);

        verificationCodeRepository.save(vc);

        // Send verification code via appropriate channel
        try {
            if (UserService.isEmail(identifier)) {
                emailService.sendVerificationCode(identifier, code);
            } else {
                smsService.sendVerificationCode(identifier, code);
            }
        } catch (Exception e) {
            log.error("Failed to send verification code to {}: {}", identifier, e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "验证码发送失败，请稍后重试"));
        }

        return ResponseEntity.ok().build();
    }

    @PostMapping("/verify-code")
    public ResponseEntity<?> verifyCode(@Valid @RequestBody VerifyCodeRequest request) {
        String identifier = request.getIdentifier();

        if (!UserService.isEmail(identifier) && !UserService.isPhone(identifier)) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", "请输入正确的邮箱或手机号"));
        }

        boolean valid = verificationCodeRepository
                .findTopByTargetAndCodeAndUsedFalseAndExpiresAtAfterOrderByCreatedAtDesc(
                        identifier, request.getCode(), LocalDateTime.now())
                .isPresent();

        if (!valid) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", "验证码错误或已过期"));
        }

        return ResponseEntity.ok().build();
    }

    @PostMapping("/register")
    @Transactional
    public ResponseEntity<?> register(@Valid @RequestBody RegisterRequest request) {
        String identifier = request.getIdentifier();
        String code = request.getCode();

        // Validate format
        if (!UserService.isEmail(identifier) && !UserService.isPhone(identifier)) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", "请输入正确的邮箱或手机号"));
        }

        // Atomically consume the verification code
        int consumed = verificationCodeRepository.consumeCode(identifier, code, LocalDateTime.now());

        if (consumed == 0) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(Map.of("error", "验证码错误或已过期"));
        }

        // Register user
        User user = userService.registerUser(identifier, request.getPassword());

        // Generate token pair for auto-login
        String token = userService.generateToken(user.getId());
        String refreshToken = userService.generateRefreshToken(user.getId());

        return ResponseEntity.ok(new LoginResponse(token, refreshToken, user));
    }

    @PostMapping("/login-password")
    public ResponseEntity<?> loginWithPassword(@Valid @RequestBody LoginRequest request) {
        String identifier = request.getIdentifier();
        String password = request.getPassword();

        // Login attempt rate limiting
        String rateKey = "pwd:" + identifier;
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
            User user = userService.authenticatePassword(identifier, password);
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
    public ResponseEntity<?> refreshToken(@Valid @RequestBody RefreshTokenRequest body) {
        String refreshToken = body.getRefreshToken();

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
            userService.resetPassword(request.getIdentifier(), request.getCode(), request.getNewPassword());
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

        try {
            userService.bindEmail(userId, request.getEmail(), request.getCode());
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            if (e instanceof org.springframework.web.server.ResponseStatusException rse) {
                return ResponseEntity.status(rse.getStatusCode())
                        .body(Map.of("error", rse.getReason()));
            }
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "绑定邮箱失败"));
        }
    }
}
