package com.trektrace.entity;

import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDateTime;

@Entity
@Table(name = "friendships", uniqueConstraints = {
        @UniqueConstraint(columnNames = {"requester_id", "addressee_id"})
}, indexes = {
        @Index(name = "idx_friendship_addressee", columnList = "addressee_id"),
        @Index(name = "idx_friendship_status", columnList = "status")
})
@Data
public class Friendship {

    public enum FriendshipStatus {
        PENDING, ACCEPTED, DECLINED, BLOCKED
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "requester_id", nullable = false)
    private Long requesterId;

    @Column(name = "addressee_id", nullable = false)
    private Long addresseeId;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private FriendshipStatus status = FriendshipStatus.PENDING;

    @Column(name = "expires_at")
    private LocalDateTime expiresAt;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @ManyToOne
    @JoinColumn(name = "requester_id", insertable = false, updatable = false)
    private User requester;

    @ManyToOne
    @JoinColumn(name = "addressee_id", insertable = false, updatable = false)
    private User addressee;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
