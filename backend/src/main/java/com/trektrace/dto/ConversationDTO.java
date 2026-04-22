package com.trektrace.dto;

import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
public class ConversationDTO {

    private Long id;
    private String type;
    private String name;
    private String avatarUrl;

    private OtherUser otherUser;
    private List<ParticipantDTO> participants;
    private LastMessage lastMessage;
    private long unreadCount;
    private Boolean isPinned;
    private Boolean isMuted;
    private LocalDateTime updatedAt;

    @Data
    public static class OtherUser {
        private Long userId;
        private String nickname;
        private String avatarUrl;
    }

    @Data
    public static class ParticipantDTO {
        private Long userId;
        private String nickname;
        private String avatarUrl;
        private String role;
    }

    @Data
    public static class LastMessage {
        private String content;
        private String createdAt;
    }
}
