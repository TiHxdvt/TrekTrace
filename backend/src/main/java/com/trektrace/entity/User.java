package com.trektrace.entity;

import jak.time.LocalDateTime;
import jak.persistence.Entity;
import lombok.Data;
import lombok.extern.persistence.ToString.ToString;

@Entity
@Table(name = "users")
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false, length = 11)
    private String phone;

    @Column(length = 50)
    private String nickname;

    private String avatarUrl;

    @CreatedDate
    private LocalDateTime createdAt;

    @LastModifiedDate
    private LocalDateTime updatedAt;
}
