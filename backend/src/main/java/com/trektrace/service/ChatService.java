package com.trektrace.service;

import com.trektrace.dto.ChatMessageDTO;
import com.trektrace.dto.ConversationDTO;
import com.trektrace.entity.*;
import com.trektrace.repository.ConversationParticipantRepository;
import com.trektrace.repository.ConversationRepository;
import com.trektrace.repository.MessageRepository;
import com.trektrace.repository.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class ChatService {

    @Value("${app.upload.dir:/app/uploads}")
    private String uploadDir;

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
    public ChatMessageDTO sendMessage(Long senderId, Long conversationId, String content,
                                       String mediaType, String mediaUrl, Long mediaSize,
                                       Double latitude, Double longitude) {
        Conversation conversation = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "会话不存在"));

        participantRepository.findByConversationIdAndUserId(conversationId, senderId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "你不是该会话的参与者"));

        Message message = new Message();
        message.setConversationId(conversationId);
        message.setSenderId(senderId);
        message.setContent(content != null ? content : "");

        // 根据参数确定消息类型
        if (mediaType != null) {
            message.setMediaType(mediaType);
            message.setMediaUrl(mediaUrl);
            message.setMediaSize(mediaSize);
            switch (mediaType) {
                case "IMAGE" -> message.setType(Message.MessageType.IMAGE);
                case "AUDIO" -> message.setType(Message.MessageType.AUDIO);
                default -> message.setType(Message.MessageType.TEXT);
            }
        } else if (latitude != null && longitude != null) {
            message.setType(Message.MessageType.LOCATION);
            message.setLatitude(latitude);
            message.setLongitude(longitude);
        } else {
            message.setType(Message.MessageType.TEXT);
        }

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

    @Transactional
    public ChatMessageDTO recallMessage(Long userId, Long messageId) {
        Message message = messageRepository.findById(messageId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "消息不存在"));

        if (!message.getSenderId().equals(userId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "只能撤回自己的消息");
        }

        if (message.getCreatedAt() != null
                && message.getCreatedAt().isBefore(LocalDateTime.now().minusMinutes(2))) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "消息已超过2分钟，无法撤回");
        }

        message.setType(Message.MessageType.RECALLED);
        message.setContent("");
        message.setMediaUrl(null);
        message.setMediaType(null);
        message.setMediaSize(null);
        message.setLatitude(null);
        message.setLongitude(null);
        messageRepository.save(message);

        ChatMessageDTO dto = new ChatMessageDTO(message);

        // 推送撤回通知给会话所有参与者
        webSocketService.sendToConversation(message.getConversationId(), dto);
        List<ConversationParticipant> participants = participantRepository.findByConversationId(message.getConversationId());
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

        Page<ChatMessageDTO> dtos = messageRepository.findByConversationIdOrderByIdDesc(conversationId, PageRequest.of(page, size))
                .map(ChatMessageDTO::new);
        populateIsRead(dtos.getContent(), userId, conversationId);
        return dtos;
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

    /**
     * 增量同步：拉取指定用户参与的所有会话中，ID 大于 after 的消息（上限 500 条）
     */
    public List<ChatMessageDTO> syncMessages(Long userId, Long after) {
        Set<Long> userConvIds = conversationRepository.findByUserId(userId)
                .stream().map(Conversation::getId).collect(Collectors.toSet());

        if (userConvIds.isEmpty()) {
            return Collections.emptyList();
        }

        List<Message> messages = messageRepository.findByConversationIdsAndAfter(
                userConvIds, after, PageRequest.of(0, 500));

        List<ChatMessageDTO> dtos = messages.stream()
                .map(ChatMessageDTO::new)
                .collect(Collectors.toList());

        // 按 conversationId 分组后分别填充 isRead
        Map<Long, List<ChatMessageDTO>> byConvId = dtos.stream()
                .collect(Collectors.groupingBy(ChatMessageDTO::getConversationId));
        for (Map.Entry<Long, List<ChatMessageDTO>> entry : byConvId.entrySet()) {
            populateIsRead(entry.getValue(), userId, entry.getKey());
        }

        return dtos;
    }

    /**
     * 删除会话及其所有消息（仅参与者可操作）
     */
    @Transactional
    public void deleteConversation(Long userId, Long conversationId) {
        participantRepository.findByConversationIdAndUserId(conversationId, userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "你不是该会话的参与者"));

        // 收集媒体文件 URL 并删除物理文件
        List<Message> messages = messageRepository.findByConversationIdOrderByIdDesc(conversationId, PageRequest.of(0, Integer.MAX_VALUE)).getContent();
        List<String> mediaUrls = messages.stream()
                .map(Message::getMediaUrl)
                .filter(Objects::nonNull)
                .collect(Collectors.toList());
        deleteMediaFiles(mediaUrls);

        messageRepository.deleteByConversationId(conversationId);
        participantRepository.deleteByConversationId(conversationId);
        conversationRepository.deleteById(conversationId);
    }

    /**
     * 删除单条消息（仅发送者可操作）
     */
    @Transactional
    public void deleteMessage(Long userId, Long messageId) {
        Message message = messageRepository.findById(messageId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "消息不存在"));

        if (!message.getSenderId().equals(userId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "只能删除自己的消息");
        }

        messageRepository.delete(message);
    }

    /**
     * 删除媒体文件（物理文件）
     */
    private void deleteMediaFiles(List<String> mediaUrls) {
        if (mediaUrls == null || mediaUrls.isEmpty()) return;

        Path chatDir = Paths.get(uploadDir, "chat").toAbsolutePath().normalize();
        for (String url : mediaUrls) {
            // url 格式: /api/chat/media/filename
            String filename = url.substring(url.lastIndexOf('/') + 1);
            try {
                Path file = chatDir.resolve(filename);
                Files.deleteIfExists(file);
            } catch (Exception e) {
                // 文件删除失败不影响会话删除
            }
        }
    }

    /**
     * 填充消息的 isRead 字段
     * 根据 conversationId 对应参与者记录的 lastReadMessageId 判断
     */
    private void populateIsRead(List<ChatMessageDTO> dtos, Long userId, Long conversationId) {
        if (dtos == null || dtos.isEmpty()) return;

        participantRepository.findByConversationIdAndUserId(conversationId, userId)
                .ifPresent(participant -> {
                    Long lastReadId = participant.getLastReadMessageId();
                    for (ChatMessageDTO dto : dtos) {
                        dto.setIsRead(lastReadId != null && dto.getId() != null && dto.getId() <= lastReadId);
                    }
                });
    }
}
