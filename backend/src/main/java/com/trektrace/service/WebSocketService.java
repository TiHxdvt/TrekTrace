package com.trektrace.service;

import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

@Service
public class WebSocketService {

    private final SimpMessagingTemplate messagingTemplate;

    public WebSocketService(SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }

    public void sendToUser(Long userId, String destination, Object payload) {
        messagingTemplate.convertAndSendToUser(
                String.valueOf(userId),
                destination,
                payload
        );
    }

    public void sendToConversation(Long conversationId, Object payload) {
        messagingTemplate.convertAndSend("/topic/conversation/" + conversationId, payload);
    }
}
