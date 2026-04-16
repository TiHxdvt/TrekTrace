package com.trektrace.dto;

import lombok.Data;

@Data
public class ConversationDTO {

    private Long id;
    private String type;
    private String name;

    private OtherUser otherUser;
    private LastMessage lastMessage;
    private long unreadCount;

    @Data
    public static class OtherUser {
        private Long userId;
        private String nickname;
        private String avatarUrl;
    }

    @Data
    public static class LastMessage {
        private String content;
        private String createdAt;
    }
}
