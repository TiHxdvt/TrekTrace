package com.trektrace.entity;

import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDateTime;

@Entity
@Table(name = "messages", indexes = {
        @Index(name = "idx_messages_conversation_id", columnList = "conversation_id"),
        @Index(name = "idx_messages_sender_id", columnList = "sender_id")
})
@Data
public class Message {

    public enum MessageType {
        TEXT, SYSTEM, IMAGE, AUDIO, LOCATION, RECALLED
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "conversation_id", nullable = false)
    private Long conversationId;

    @Column(name = "sender_id", nullable = false)
    private Long senderId;

    @Column(name = "content", columnDefinition = "TEXT")
    private String content;

    @Enumerated(EnumType.STRING)
    @Column(name = "type", nullable = false, columnDefinition = "VARCHAR(20)")
    private MessageType type = MessageType.TEXT;

    @Column(name = "media_url")
    private String mediaUrl;

    @Column(name = "media_type")
    private String mediaType;

    @Column(name = "media_size")
    private Long mediaSize;

    @Column(name = "latitude")
    private Double latitude;

    @Column(name = "longitude")
    private Double longitude;

    @Column(name = "duration")
    private Integer duration;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @ManyToOne
    @JoinColumn(name = "sender_id", insertable = false, updatable = false)
    private User sender;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
