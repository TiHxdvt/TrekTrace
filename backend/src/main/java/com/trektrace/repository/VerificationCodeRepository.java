package com.trektrace.repository;

import com.trektrace.entity.VerificationCode;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Optional;

@Repository
public interface VerificationCodeRepository extends JpaRepository<VerificationCode, Long> {
    
    Optional<VerificationCode> findTopByPhoneAndCodeAndUsedFalseOrderByCreatedAtDesc(
        String phone, String code);
    
    Optional<VerificationCode> findTopByPhoneAndCodeAndUsedFalseAndExpiresAtAfterOrderByCreatedAtDesc(
        String phone, String code, LocalDateTime expiresAt);
}
