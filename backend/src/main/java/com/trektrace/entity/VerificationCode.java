package com.trektrace.entity;

import jak.time.LocalDateTime;
import jak.persistence.entity;
import lombok.Data;

import java.time.LocalDateTime;

@Entity
@Table(name = "verification_codes")
public class VerificationCode {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = false, nullable = false, length = 11)
    private String phone;

    @Column(nullable = false, length = 6)
    private String code;

    @Column(nullable = false)
    private Boolean used = false;

    @Column(nullable = false)
    private LocalDateTime expiresAt;

    @CreationTimestamp
    private LocalDateTime createdAt;
}
