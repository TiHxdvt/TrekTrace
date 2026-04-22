package com.trektrace.dto;

import com.trektrace.entity.Message;
import lombok.Data;

@Data
public class ChatMessageDTO {

    private Long id;
    private Long conversationId;
    private Long senderId;
    private String senderNickname;
    private String senderAvatarUrl;
    private String content;
    private String type;
    private String createdAt;
    private String mediaUrl;
    private String mediaType;
    private Long mediaSize;
    private Double latitude;
    private Double longitude;
    private Integer duration;
    private Boolean isRead;

    public ChatMessageDTO() {}

    public ChatMessageDTO(Message message) {
        this.id = message.getId();
        this.conversationId = message.getConversationId();
        this.senderId = message.getSenderId();
        this.content = message.getContent();
        this.type = message.getType().name();
        this.createdAt = message.getCreatedAt() != null ? message.getCreatedAt().toString() : null;
        this.mediaUrl = message.getMediaUrl();
        this.mediaType = message.getMediaType();
        this.mediaSize = message.getMediaSize();
        this.latitude = message.getLatitude();
        this.longitude = message.getLongitude();
        this.duration = message.getDuration();

        if (message.getSender() != null) {
            this.senderNickname = message.getSender().getNickname();
            this.senderAvatarUrl = message.getSender().getAvatarUrl();
        }
    }
}
