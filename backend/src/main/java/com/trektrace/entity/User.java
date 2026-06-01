package com.trektrace.entity;

import java.math.BigDecimal;
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

    @Column(unique = true)
    private Long account;

    @Column(unique = true, length = 11)
    private String phone;

    @Column(length = 50)
    private String nickname;

    @Column(name = "avatar_url")
    private String avatarUrl;

    @Column(name = "password")
    private String password;

    @Column(unique = true)
    private String email;

    @Column(name = "email_verified")
    private Boolean emailVerified = false;

    @Column(name = "password_version", nullable = false)
    private Integer passwordVersion = 1;

    @Column(name = "nickname_updated_at")
    private LocalDateTime nicknameUpdatedAt;

    @Column(precision = 5, scale = 1)
    private BigDecimal weight;

    @Column(name = "bio", length = 200)
    private String bio;

    @Column(name = "gender", length = 10)
    private String gender;

    @Column(name = "height", precision = 5, scale = 1)
    private BigDecimal height;

    @Column(name = "last_latitude", precision = 10, scale = 8)
    private BigDecimal lastLatitude;

    @Column(name = "last_longitude", precision = 11, scale = 8)
    private BigDecimal lastLongitude;

    @Column(name = "last_location_at")
    private LocalDateTime lastLocationAt;

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
