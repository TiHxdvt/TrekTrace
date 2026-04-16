package com.trektrace.config;

import com.trektrace.util.JwtUtil;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.stereotype.Component;

import java.security.Principal;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class WebSocketAuthInterceptor implements ChannelInterceptor {

    private final JwtUtil jwtUtil;

    private final Map<String, Long> sessionToUser = new ConcurrentHashMap<>();
    private final Map<Long, Set<String>> userToSessions = new ConcurrentHashMap<>();

    public WebSocketAuthInterceptor(JwtUtil jwtUtil) {
        this.jwtUtil = jwtUtil;
    }

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);

        if (accessor != null && StompCommand.CONNECT.equals(accessor.getCommand())) {
            String token = accessor.getFirstNativeHeader("Authorization");
            if (token != null && token.startsWith("Bearer ")) {
                token = token.substring(7);
            }

            if (token == null || !jwtUtil.validateToken(token)) {
                return null;
            }

            Long userId = jwtUtil.getUserIdFromToken(token);
            if (userId == null) {
                return null;
            }

            String sessionId = accessor.getSessionId();
            sessionToUser.put(sessionId, userId);
            userToSessions.computeIfAbsent(userId, k -> ConcurrentHashMap.newKeySet()).add(sessionId);

            accessor.setUser(new Principal() {
                @Override
                public String getName() {
                    return String.valueOf(userId);
                }
            });
        }

        if (accessor != null && StompCommand.DISCONNECT.equals(accessor.getCommand())) {
            String sessionId = accessor.getSessionId();
            if (sessionId != null) {
                Long userId = sessionToUser.remove(sessionId);
                if (userId != null) {
                    Set<String> sessions = userToSessions.get(userId);
                    if (sessions != null) {
                        sessions.remove(sessionId);
                        if (sessions.isEmpty()) {
                            userToSessions.remove(userId);
                        }
                    }
                }
            }
        }

        return message;
    }

    public boolean isUserOnline(Long userId) {
        return userToSessions.containsKey(userId);
    }
}
