package com.trektrace.dto;

import lombok.Data;

public class LoginResponse {
    private String token;
    private User user;
    
    @Data
    public static class User {
        private Long id;
        private String phone;
        private String nickname;
        private String avatarUrl;
        
        public User(Long id, String phone, String nickname, String avatarUrl) {
            this.id = id;
            this.phone = phone;
            this.nickname = nickname;
            this.avatarUrl = avatarUrl;
        }
    }
}
