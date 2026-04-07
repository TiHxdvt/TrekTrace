package com.trektrace.controller;

import com.trektrace.dto.LoginRequest;
import com.trektrace.dto.LoginResponse;
import com.trektrace.entity.User;
import com.trektrace.entity.VerificationCode;
import com.trektrace.service.UserService;
import com.trektrace.service.SmsService;
import com.trektrace.repository.VerificationCodeRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    
    @Autowired
    private UserService userService;
    
    @Autowired
    private SmsService smsService;
    
    @Autowired
    private VerificationCodeRepository verificationCodeRepository;
    
    @PostMapping("/send-code")
    public ResponseEntity<Void> sendVerificationCode(@RequestBody LoginRequest request) {
        String phone = request.getPhone();
        
        // 验证手机号格式
        if (phone == null || !phone.matches("^1[3-9]\\d{11}$")) {
            return ResponseEntity.badRequest("手机号格式不正确");
        }
        
        // 生成并保存验证码
        String code = String.format("%06d", new java.util.Random().nextInt(1000000));
        VerificationCode vc = new VerificationCode();
        vc.setPhone(phone);
        vc.setCode(code);
        vc.setExpiresAt(LocalDateTime.now().plusMinutes(5));
        vc.setUsed(false);
        
        verificationCodeRepository.save(vc);
        
        // 发送验证码
        smsService.sendVerificationCode(phone);
        
        return ResponseEntity.ok().build();
    }
    
    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@RequestBody LoginRequest request) {
        String phone = request.getPhone();
        String code = request.getCode();
        
        // 验证验证码
        Optional<VerificationCode> vcOpt = verificationCodeRepository
            .findTopByPhoneAndCodeAndExpiresAtAfter(phone, code);
        
        if (vcOpt.isEmpty()) {
            return ResponseEntity.badRequest("验证码错误或已过期");
        }
        
        VerificationCode vc = vcOpt.get();
        if (vc.isUsed()) {
            return ResponseEntity.badRequest("验证码已使用");
        }
        if (vc.getExpiresAt().isBefore(LocalDateTime.now())) {
            return ResponseEntity.badRequest("验证码已过期");
        }
        
        // 标记验证码已使用
        vc.setUsed(true);
        verificationCodeRepository.save(vc);
        
        // 登录或创建用户
        User user = userService.createOrGetUser(phone);
        
        // 生成 token
        String token = userService.generateToken(user.getId());
        
        return ResponseEntity.ok(new LoginResponse(token, user));
    }
}
