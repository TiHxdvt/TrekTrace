package com.trektrace.dto;

import com.trektrace.entity.User;
import lombok.Data;

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

    public ProfileResponse(User user) {
        this.id = user.getId();
        this.account = user.getAccount();
        this.phone = maskPhone(user.getPhone());
        this.nickname = user.getNickname();
        this.avatarUrl = user.getAvatarUrl();
        this.createdAt = user.getCreatedAt();
        this.nicknameUpdatedAt = user.getNicknameUpdatedAt();
    }

    private static String maskPhone(String phone) {
        if (phone != null && phone.length() >= 7) {
            return phone.substring(0, 3) + "****" + phone.substring(phone.length() - 4);
        }
        return phone;
    }
}
