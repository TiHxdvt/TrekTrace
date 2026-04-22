package com.trektrace.dto;

import com.trektrace.entity.User;
import com.trektrace.util.PhoneUtils;
import lombok.Data;

@Data
public class LoginResponse {

    private String token;
    private String refreshToken;
    private UserDTO user;

    public LoginResponse(String token, String refreshToken, User user) {
        this.token = token;
        this.refreshToken = refreshToken;
        this.user = new UserDTO(user);
    }

    // Backward-compatible constructor
    public LoginResponse(String token, User user) {
        this.token = token;
        this.user = new UserDTO(user);
    }

    @Data
    public static class UserDTO {
        private Long id;
        private Long account;
        private String phone;
        private String nickname;
        private String avatarUrl;
        private String email;
        private Boolean emailVerified;

        public UserDTO(User user) {
            this.id = user.getId();
            this.account = user.getAccount();
            this.phone = PhoneUtils.maskPhone(user.getPhone());
            this.nickname = user.getNickname();
            this.avatarUrl = user.getAvatarUrl();
            this.email = user.getEmail();
            this.emailVerified = user.getEmailVerified();
        }
    }
}
