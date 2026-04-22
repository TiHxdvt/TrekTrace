package com.trektrace.config;

import com.trektrace.service.TokenBlacklistService;
import com.trektrace.service.UserService;
import com.trektrace.entity.User;
import com.trektrace.util.JwtUtil;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Collections;
import java.util.logging.Logger;

@Component
public class JwtAuthFilter extends OncePerRequestFilter {

    private static final Logger log = Logger.getLogger(JwtAuthFilter.class.getName());

    private final JwtUtil jwtUtil;
    private final TokenBlacklistService tokenBlacklistService;
    private final UserService userService;

    public JwtAuthFilter(JwtUtil jwtUtil, TokenBlacklistService tokenBlacklistService, UserService userService) {
        this.jwtUtil = jwtUtil;
        this.tokenBlacklistService = tokenBlacklistService;
        this.userService = userService;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        String header = request.getHeader("Authorization");

        if (header != null && header.startsWith("Bearer ")) {
            String token = header.substring(7);
            if (jwtUtil.validateToken(token)) {
                String jti = jwtUtil.getTokenId(token);
                if (jti != null && tokenBlacklistService.isBlacklisted(jti)) {
                    log.fine("Blacklisted JWT token");
                } else {
                    Long userId = jwtUtil.getUserIdFromToken(token);
                    if (userId != null) {
                        // 校验 passwordVersion：密码修改后旧 token 失效
                        Integer tokenPv = jwtUtil.getPasswordVersion(token);
                        if (tokenPv != null) {
                            User user = userService.getUserById(userId);
                            int currentPv = user.getPasswordVersion() != null ? user.getPasswordVersion() : 1;
                            if (tokenPv != currentPv) {
                                log.fine("Token passwordVersion mismatch, userId=" + userId);
                                response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                                return;
                            }
                        }
                        UsernamePasswordAuthenticationToken auth =
                                new UsernamePasswordAuthenticationToken(userId, null, Collections.emptyList());
                        SecurityContextHolder.getContext().setAuthentication(auth);
                        log.fine("Authenticated userId=" + userId);
                    }
                }
            } else {
                log.fine("Invalid JWT token");
            }
        }

        filterChain.doFilter(request, response);
    }
}
