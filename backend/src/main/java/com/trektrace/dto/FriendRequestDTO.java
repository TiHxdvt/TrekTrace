package com.trektrace.dto;

import lombok.Data;

@Data
public class FriendRequestDTO {
    private Long id;
    private Long requesterId;
    private String requesterNickname;
    private String requesterAvatarUrl;
    private String status;
    private String createdAt;
    private String expiresAt;

    public FriendRequestDTO(Long id, Long requesterId, String requesterNickname,
                             String requesterAvatarUrl, String status, String createdAt,
                             String expiresAt) {
        this.id = id;
        this.requesterId = requesterId;
        this.requesterNickname = requesterNickname;
        this.requesterAvatarUrl = requesterAvatarUrl;
        this.status = status;
        this.createdAt = createdAt;
        this.expiresAt = expiresAt;
    }
}
