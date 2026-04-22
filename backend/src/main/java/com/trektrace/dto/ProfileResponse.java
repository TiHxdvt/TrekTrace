package com.trektrace.dto;

import com.trektrace.entity.User;
import com.trektrace.util.PhoneUtils;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
public class ProfileResponse {
    private Long id;
    private Long account;
    private String phone;
    private String nickname;
    private String avatarUrl;
    private LocalDateTime createdAt;
    private LocalDateTime nicknameUpdatedAt;
    private boolean hasPassword;
    private String email;
    private Boolean emailVerified;
    private BigDecimal weight;
    private String bio;
    private String gender;
    private BigDecimal height;

    public ProfileResponse(User user) {
        this.id = user.getId();
        this.account = user.getAccount();
        this.phone = PhoneUtils.maskPhone(user.getPhone());
        this.nickname = user.getNickname();
        this.avatarUrl = user.getAvatarUrl();
        this.createdAt = user.getCreatedAt();
        this.nicknameUpdatedAt = user.getNicknameUpdatedAt();
        this.hasPassword = user.getPassword() != null;
        this.email = user.getEmail();
        this.emailVerified = user.getEmailVerified();
        this.weight = user.getWeight();
        this.bio = user.getBio();
        this.gender = user.getGender();
        this.height = user.getHeight();
    }
}
