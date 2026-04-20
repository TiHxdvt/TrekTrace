package com.trektrace.entity;

import java.time.LocalDateTime;
import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;

@Entity
@Table(name = "verification_codes", indexes = {
        @Index(name = "idx_vc_phone", columnList = "phone")
})
@Data
public class VerificationCode {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "phone", nullable = false, length = 11)
    private String phone;

    @Column(name = "code", nullable = false, length = 6)
    private String code;

    @Column(name = "used", nullable = false)
    private Boolean used = false;

    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;

    @Column(name = "created_at")
    @CreationTimestamp
    private LocalDateTime createdAt;
}
