package com.trektrace.repository;

import com.trektrace.entity.TokenBlacklist;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Repository
public interface TokenBlacklistRepository extends JpaRepository<TokenBlacklist, Long> {

    boolean existsByJti(String jti);

    @Modifying
    @Transactional
    void deleteByExpiresAtBefore(LocalDateTime time);

    @Modifying
    @Transactional
    @Query("UPDATE TokenBlacklist t SET t.expiresAt = :now WHERE t.userId = :userId AND t.expiresAt > :now")
    void blacklistAllByUserId(Long userId, LocalDateTime now);
}
