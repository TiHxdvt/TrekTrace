package com.trektrace.service;

import com.trektrace.dto.ChatMessageDTO;
import com.trektrace.dto.ConversationDTO;
import com.trektrace.entity.*;
import com.trektrace.repository.ConversationParticipantRepository;
import com.trektrace.repository.ConversationRepository;
import com.trektrace.repository.MessageRepository;
import com.trektrace.repository.UserRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class ChatService {

    private final ConversationRepository conversationRepository;
    private final ConversationParticipantRepository participantRepository;
    private final MessageRepository messageRepository;
    private final UserRepository userRepository;
    private final WebSocketService webSocketService;

    public ChatService(ConversationRepository conversationRepository,
                       ConversationParticipantRepository participantRepository,
                       MessageRepository messageRepository,
                       UserRepository userRepository,
                       WebSocketService webSocketService) {
        this.conversationRepository = conversationRepository;
        this.participantRepository = participantRepository;
        this.messageRepository = messageRepository;
        this.userRepository = userRepository;
        this.webSocketService = webSocketService;
    }

    @Transactional
    public synchronized Conversation getOrCreateDirectConversation(Long userId1, Long userId2) {
        return conversationRepository.findDirectConversation(userId1, userId2)
                .orElseGet(() -> createDirectConversation(userId1, userId2));
    }

    private Conversation createDirectConversation(Long userId1, Long userId2) {
        Conversation conversation = new Conversation();
        conversation.setType(Conversation.ConversationType.DIRECT);
        conversationRepository.save(conversation);

        ConversationParticipant p1 = new ConversationParticipant();
        p1.setConversationId(conversation.getId());
        p1.setUserId(userId1);
        participantRepository.save(p1);

        ConversationParticipant p2 = new ConversationParticipant();
        p2.setConversationId(conversation.getId());
        p2.setUserId(userId2);
        participantRepository.save(p2);

        return conversation;
    }

    @Transactional
    public ChatMessageDTO sendMessage(Long senderId, Long conversationId, String content) {
        Conversation conversation = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "会话不存在"));

        participantRepository.findByConversationIdAndUserId(conversationId, senderId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "你不是该会话的参与者"));

        Message message = new Message();
        message.setConversationId(conversationId);
        message.setSenderId(senderId);
        message.setContent(content);
        message.setType(Message.MessageType.TEXT);
        messageRepository.save(message);

        // Properly update conversation timestamp
        conversation.setUpdatedAt(LocalDateTime.now());
        conversationRepository.save(conversation);

        ChatMessageDTO dto = new ChatMessageDTO(message);

        // Push via WebSocket to the conversation topic
        webSocketService.sendToConversation(conversationId, dto);

        // Also push to each participant's personal queue
        List<ConversationParticipant> participants = participantRepository.findByConversationId(conversationId);
        for (ConversationParticipant p : participants) {
            webSocketService.sendToUser(p.getUserId(), "/queue/messages", dto);
        }

        return dto;
    }

    public List<ConversationDTO> getConversations(Long userId) {
        List<Conversation> conversations = conversationRepository.findByUserId(userId);
        if (conversations.isEmpty()) {
            return Collections.emptyList();
        }

        // Batch load all participants for all conversations (fixes N+1)
        List<Long> convIds = conversations.stream().map(Conversation::getId).collect(Collectors.toList());
        List<ConversationParticipant> allParticipants = participantRepository.findByConversationIdIn(convIds);
        Map<Long, List<ConversationParticipant>> participantsByConvId = allParticipants.stream()
                .collect(Collectors.groupingBy(ConversationParticipant::getConversationId));

        // Batch load all unique user IDs
        Set<Long> userIds = allParticipants.stream()
                .map(ConversationParticipant::getUserId)
                .collect(Collectors.toSet());
        Map<Long, User> userMap = userRepository.findAllById(userIds).stream()
                .collect(Collectors.toMap(User::getId, u -> u));

        List<ConversationDTO> result = new ArrayList<>();

        for (Conversation conv : conversations) {
            ConversationDTO dto = new ConversationDTO();
            dto.setId(conv.getId());
            dto.setType(conv.getType().name());
            dto.setName(conv.getName());

            List<ConversationParticipant> participants = participantsByConvId.getOrDefault(conv.getId(), Collections.emptyList());

            if (conv.getType() == Conversation.ConversationType.DIRECT) {
                for (ConversationParticipant p : participants) {
                    if (!p.getUserId().equals(userId)) {
                        User other = userMap.get(p.getUserId());
                        if (other != null) {
                            ConversationDTO.OtherUser otherUser = new ConversationDTO.OtherUser();
                            otherUser.setUserId(other.getId());
                            otherUser.setNickname(other.getNickname());
                            otherUser.setAvatarUrl(other.getAvatarUrl());
                            dto.setOtherUser(otherUser);
                        }
                    }
                    if (p.getUserId().equals(userId)) {
                        long lastReadId = p.getLastReadMessageId() != null ? p.getLastReadMessageId() : 0;
                        long unread = messageRepository.countByConversationIdAndIdGreaterThan(conv.getId(), lastReadId);
                        dto.setUnreadCount(unread);
                    }
                }
            }

            // Get last message
            messageRepository.findTopByConversationIdOrderByIdDesc(conv.getId()).ifPresent(lastMsg -> {
                ConversationDTO.LastMessage lastMessage = new ConversationDTO.LastMessage();
                lastMessage.setContent(lastMsg.getContent());
                lastMessage.setCreatedAt(lastMsg.getCreatedAt() != null ? lastMsg.getCreatedAt().toString() : null);
                dto.setLastMessage(lastMessage);
            });

            result.add(dto);
        }

        return result;
    }

    public Page<ChatMessageDTO> getMessages(Long conversationId, Long userId, int page, int size) {
        participantRepository.findByConversationIdAndUserId(conversationId, userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "你不是该会话的参与者"));

        return messageRepository.findByConversationIdOrderByIdDesc(conversationId, PageRequest.of(page, size))
                .map(ChatMessageDTO::new);
    }

    @Transactional
    public void markAsRead(Long userId, Long conversationId, Long messageId) {
        ConversationParticipant participant = participantRepository
                .findByConversationIdAndUserId(conversationId, userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "你不是该会话的参与者"));

        if (participant.getLastReadMessageId() == null || participant.getLastReadMessageId() < messageId) {
            participant.setLastReadMessageId(messageId);
            participantRepository.save(participant);
        }
    }
}
