package com.trektrace.controller;

import com.trektrace.dto.ChangePhoneRequest;
import com.trektrace.entity.User;
import com.trektrace.service.UserService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/account")
public class AccountController {

    private final UserService userService;

    public AccountController(UserService userService) {
        this.userService = userService;
    }

    private Long getUserId(Authentication auth) {
        return (Long) auth.getPrincipal();
    }

    @PostMapping("/change-phone")
    public ResponseEntity<?> changePhone(
            @RequestBody ChangePhoneRequest request,
            Authentication auth) {
        // TODO: verify SMS code before changing phone
        User user = userService.changePhone(getUserId(auth), request.getPhone());
        return ResponseEntity.ok(Map.of("phone", user.getPhone()));
    }

    @DeleteMapping
    public ResponseEntity<Void> deleteAccount(Authentication auth) {
        userService.softDeleteUser(getUserId(auth));
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/visibility")
    public ResponseEntity<?> updateVisibility(
            @RequestBody Map<String, String> body,
            Authentication auth) {
        String visibility = body.get("visibility");
        User user = userService.updateVisibility(getUserId(auth), visibility);
        return ResponseEntity.ok(Map.of("visibility", user.getDataVisibility().name()));
    }
}
