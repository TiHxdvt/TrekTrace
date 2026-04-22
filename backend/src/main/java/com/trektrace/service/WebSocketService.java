package com.trektrace.service;

import com.trektrace.entity.ConversationParticipant;
import com.trektrace.repository.ConversationParticipantRepository;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class WebSocketService {

    private final SimpMessagingTemplate messagingTemplate;
    private final ConversationParticipantRepository participantRepository;

    public WebSocketService(SimpMessagingTemplate messagingTemplate,
                            ConversationParticipantRepository participantRepository) {
        this.messagingTemplate = messagingTemplate;
        this.participantRepository = participantRepository;
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

    public void sendToConversationExclude(Long conversationId, Long excludeUserId, String destination, Object payload) {
        List<ConversationParticipant> participants = participantRepository.findByConversationId(conversationId);
        for (ConversationParticipant p : participants) {
            if (!p.getUserId().equals(excludeUserId)) {
                messagingTemplate.convertAndSendToUser(
                        String.valueOf(p.getUserId()),
                        destination,
                        payload
                );
            }
        }
    }
}
