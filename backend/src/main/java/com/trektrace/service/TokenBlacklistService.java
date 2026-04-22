package com.trektrace.service;

import com.trektrace.entity.TokenBlacklist;
import com.trektrace.repository.TokenBlacklistRepository;
import com.trektrace.util.JwtUtil;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Date;

@Service
public class TokenBlacklistService {

    private final TokenBlacklistRepository tokenBlacklistRepository;
    private final JwtUtil jwtUtil;

    public TokenBlacklistService(TokenBlacklistRepository tokenBlacklistRepository, JwtUtil jwtUtil) {
        this.tokenBlacklistRepository = tokenBlacklistRepository;
        this.jwtUtil = jwtUtil;
    }

    public void blacklistToken(String token) {
        String jti = jwtUtil.getTokenId(token);
        Long userId = jwtUtil.getUserIdFromToken(token);
        Date expiration = jwtUtil.getExpirationFromToken(token);

        if (jti == null || userId == null || expiration == null) {
            return;
        }

        TokenBlacklist entry = new TokenBlacklist();
        entry.setJti(jti);
        entry.setUserId(userId);
        entry.setExpiresAt(expiration.toInstant().atZone(ZoneId.systemDefault()).toLocalDateTime());
        tokenBlacklistRepository.save(entry);
    }

    public boolean isBlacklisted(String jti) {
        return tokenBlacklistRepository.existsByJti(jti);
    }

    public void blacklistAllUserTokens(Long userId) {
        // Access tokens are invalidated via passwordVersion check in JwtAuthFilter.
        // Here we blacklist all stored refresh tokens for this user to force
        // full re-authentication on next refresh attempt.
        tokenBlacklistRepository.blacklistAllByUserId(userId, LocalDateTime.now());
    }

    @Scheduled(fixedRate = 3600000) // Run every hour
    public void cleanupExpired() {
        tokenBlacklistRepository.deleteByExpiresAtBefore(LocalDateTime.now());
    }
}
