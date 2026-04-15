package com.trektrace.controller;

import com.trektrace.dto.ProfileResponse;
import com.trektrace.dto.UpdateProfileRequest;
import com.trektrace.entity.User;
import com.trektrace.service.UserService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/user")
public class UserProfileController {

    private final UserService userService;

    public UserProfileController(UserService userService) {
        this.userService = userService;
    }

    private Long getUserId(Authentication auth) {
        return (Long) auth.getPrincipal();
    }

    @GetMapping("/profile")
    public ResponseEntity<ProfileResponse> getProfile(Authentication auth) {
        User user = userService.getUserById(getUserId(auth));
        return ResponseEntity.ok(new ProfileResponse(user));
    }

    @PutMapping("/profile")
    public ResponseEntity<ProfileResponse> updateProfile(
            @Valid @RequestBody UpdateProfileRequest request,
            Authentication auth) {
        User user = userService.updateProfile(getUserId(auth), request.getNickname(), request.getAvatarUrl());
        return ResponseEntity.ok(new ProfileResponse(user));
    }
}
