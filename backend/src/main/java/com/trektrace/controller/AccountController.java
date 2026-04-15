package com.trektrace.controller;

import com.trektrace.dto.ChangePhoneRequest;
import com.trektrace.dto.UpdateVisibilityRequest;
import com.trektrace.entity.User;
import com.trektrace.entity.VerificationCode;
import com.trektrace.service.ActivityService;
import com.trektrace.service.UserService;
import com.trektrace.repository.VerificationCodeRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.Map;

@RestController
@RequestMapping("/api/account")
public class AccountController {

    private final UserService userService;
    private final ActivityService activityService;
    private final VerificationCodeRepository verificationCodeRepository;

    public AccountController(UserService userService, ActivityService activityService, VerificationCodeRepository verificationCodeRepository) {
        this.userService = userService;
        this.activityService = activityService;
        this.verificationCodeRepository = verificationCodeRepository;
    }

    private Long getUserId(Authentication auth) {
        return (Long) auth.getPrincipal();
    }

    @PostMapping("/change-phone")
    public ResponseEntity<?> changePhone(
            @RequestBody ChangePhoneRequest request,
            Authentication auth) {
        String phone = request.getPhone();
        String code = request.getCode();

        if (phone == null || code == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "手机号和验证码不能为空");
        }

        // Verify SMS code
        VerificationCode vc = verificationCodeRepository
                .findTopByPhoneAndCodeAndUsedFalseOrderByCreatedAtDesc(phone, code)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "验证码错误或已过期"));

        if (vc.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "验证码已过期");
        }

        // Mark code as used
        vc.setUsed(true);
        verificationCodeRepository.save(vc);

        User user = userService.changePhone(getUserId(auth), phone);
        return ResponseEntity.ok(Map.of("phone", user.getPhone()));
    }

    @DeleteMapping
    public ResponseEntity<Void> deleteAccount(Authentication auth) {
        Long userId = getUserId(auth);
        activityService.deleteAllActivitiesAndUser(userId);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/visibility")
    public ResponseEntity<?> updateVisibility(
            @RequestBody UpdateVisibilityRequest request,
            Authentication auth) {
        User user = userService.updateVisibility(getUserId(auth), request.getVisibility());
        return ResponseEntity.ok(Map.of("visibility", user.getDataVisibility().name()));
    }

    @GetMapping("/visibility")
    public ResponseEntity<?> getVisibility(Authentication auth) {
        User user = userService.getUserById(getUserId(auth));
        return ResponseEntity.ok(Map.of("visibility", user.getDataVisibility().name()));
    }
}
