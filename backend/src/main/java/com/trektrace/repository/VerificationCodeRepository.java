package com.trektrace.repository;

import com.trektrace.entity.VerificationCode;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Optional;

@Repository
public interface VerificationCodeRepository extends JpaRepository<VerificationCode, Long> {

    Optional<VerificationCode> findTopByTargetAndCodeAndUsedFalseOrderByCreatedAtDesc(
        String target, String code);

    Optional<VerificationCode> findTopByTargetAndCodeAndUsedFalseAndExpiresAtAfterOrderByCreatedAtDesc(
        String target, String code, LocalDateTime expiresAt);

    /**
     * Atomically consume a verification code: find an unused, non-expired code
     * matching target+code and mark it as used in a single native query.
     * Uses a double-nested subquery to work around MySQL's restriction on
     * updating the same table referenced in a subquery (Error 1093).
     * Returns the number of rows affected (1 = success, 0 = invalid/expired).
     */
    @Modifying
    @Query(value = "UPDATE verification_codes SET used = 1 " +
           "WHERE id = (" +
           "  SELECT id FROM (" +
           "    SELECT id FROM verification_codes " +
           "    WHERE target = :target AND code = :code " +
           "      AND used = 0 AND expires_at > :now " +
           "    ORDER BY created_at DESC LIMIT 1" +
           "  ) AS tmp" +
           ")", nativeQuery = true)
    int consumeCode(String target, String code, LocalDateTime now);
}
