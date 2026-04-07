package com.trektrace.dto;

import com.trektrace.entity.User;
import lombok.Data;

@Data
public class LoginResponse {
    
    private String token;
    private UserDTO user;
    
    public LoginResponse(String token, User user) {
        this.token = token;
        this.user = new UserDTO(user);
    }
    
    @Data
    public static class UserDTO {
        private Long id;
        private String phone;
        private String nickname;
        private String avatarUrl;
        
        public UserDTO(User user) {
            this.id = user.getId();
            this.phone = user.getPhone();
            this.nickname = user.getNickname();
            this.avatarUrl = user.getAvatarUrl();
        }
    }
}
