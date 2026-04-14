package com.trektrace.dto;

import com.trektrace.entity.Notification;
import lombok.Data;

@Data
public class NotificationDTO {
    private Long id;
    private String type;
    private String title;
    private String content;
    private Boolean isRead;
    private Long relatedId;
    private String createdAt;

    public NotificationDTO(Notification n) {
        this.id = n.getId();
        this.type = n.getType().name();
        this.title = n.getTitle();
        this.content = n.getContent();
        this.isRead = n.getIsRead();
        this.relatedId = n.getRelatedId();
        this.createdAt = n.getCreatedAt() != null ? n.getCreatedAt().toString() : null;
    }
}
