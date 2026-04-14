package com.trektrace.entity;

import java.time.LocalDateTime;
import jakarta.persistence.*;
import lombok.Data;

@Entity
@Table(name = "users")
@Data
public class User {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false, length = 11)
    private String phone;

    @Column(length = 50)
    private String nickname;

    @Column(name = "avatar_url")
    private String avatarUrl;

    public enum DataVisibility {
        PUBLIC, FRIENDS, PRIVATE
    }

    public enum UserStatus {
        ACTIVE, DELETED
    }

    @Enumerated(EnumType.STRING)
    @Column(name = "data_visibility", nullable = false, columnDefinition = "ENUM('PUBLIC','FRIENDS','PRIVATE') DEFAULT 'FRIENDS'")
    private DataVisibility dataVisibility = DataVisibility.FRIENDS;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, columnDefinition = "ENUM('ACTIVE','DELETED') DEFAULT 'ACTIVE'")
    private UserStatus status = UserStatus.ACTIVE;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
    
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
