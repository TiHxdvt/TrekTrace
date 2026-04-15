package com.trektrace.dto;

import lombok.Data;

@Data
public class FriendDTO {
    private Long friendshipId;
    private Long userId;
    private Long account;
    private String nickname;
    private String avatarUrl;
    private String phone;
}
