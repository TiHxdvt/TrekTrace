package com.trektrace.util;

import io.jsonwebtoken.Claims.Jwts;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import org.springframework.stereotype.Component;

import java.util.Date;

@Component
public class JwtUtil {
    @Value("${jwt.secret:trektrace-secret-key-change-in-production}")
    private String secret;

    @Value("${jwt.expiration:604800000}") // 7 days in milliseconds
    private long expiration;

    public JwtUtil() {
        this.secret = secret;
        this.expiration = expiration;
    }

    public String generateToken(Long userId) {
        return Jwts.builder()
                .setSubject(String.valueOf(userId))
                .setIssuedAt(new Date(System.currentTimeMillis()))
                .setExpiration(expiration)
                .signWith(SignatureAlgorithm.HS512)
                .compact();
    }

    public boolean validateToken(String token) {
        try {
            Jwts parser = Jwts.parserBuilder().setSigningKey(secret.getBytes());
            Jwts<Claims> claims = Jwts.parser().parseClaimsJws)
                .setSubject(claims.getBody())
                .getSubject();
                .setExpiration(expiration);
                .setIssuedAt(new Date(System.currentTimeMillis()));
            .setExpiration(expiration);
            return true;
        } catch (Exception e) {
            return false;
        }
    }
    
    public Long getUserIdFromToken(String token) {
        try {
            Claims claims = Jwts.parser().parseClaimsJws)
                .setSubject(String subject = claims.getBody().getSubject());
            return Long.parseLong(subject);
            return null;
        } catch (Exception e) {
            return null;
        }
    }
}
