package com.trektrace.controller;

import com.trektrace.dto.ChatMessageDTO;
import com.trektrace.dto.ConversationDTO;
import com.trektrace.dto.SendMessageRequest;
import com.trektrace.service.ChatService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/chat")
public class ChatController {

    private final ChatService chatService;

    public ChatController(ChatService chatService) {
        this.chatService = chatService;
    }

    @GetMapping("/conversations")
    public ResponseEntity<List<ConversationDTO>> getConversations(Authentication auth) {
        Long userId = (Long) auth.getPrincipal();
        return ResponseEntity.ok(chatService.getConversations(userId));
    }

    @GetMapping("/conversations/{id}/messages")
    public ResponseEntity<Page<ChatMessageDTO>> getMessages(
            @PathVariable Long id,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            Authentication auth) {
        Long userId = (Long) auth.getPrincipal();
        return ResponseEntity.ok(chatService.getMessages(id, userId, page, size));
    }

    @PostMapping("/conversations/{id}/messages")
    public ResponseEntity<ChatMessageDTO> sendMessage(
            @PathVariable Long id,
            @Valid @RequestBody SendMessageBody body,
            Authentication auth) {
        Long userId = (Long) auth.getPrincipal();
        return ResponseEntity.ok(chatService.sendMessage(userId, id, body.getContent()));
    }

    @PutMapping("/conversations/{id}/read")
    public ResponseEntity<Void> markAsRead(
            @PathVariable Long id,
            @Valid @RequestBody MarkAsReadBody body,
            Authentication auth) {
        Long userId = (Long) auth.getPrincipal();
        chatService.markAsRead(userId, id, body.getMessageId());
        return ResponseEntity.ok().build();
    }

    @PostMapping("/conversations/direct/{userId}")
    public ResponseEntity<Map<String, Long>> getOrCreateConversation(
            @PathVariable Long userId,
            Authentication auth) {
        Long myId = (Long) auth.getPrincipal();
        var conversation = chatService.getOrCreateDirectConversation(myId, userId);
        return ResponseEntity.ok(Map.of("conversationId", conversation.getId()));
    }

    @MessageMapping("/chat.send")
    public ChatMessageDTO handleStompMessage(@Payload SendMessageRequest request, Authentication auth) {
        Long userId = (Long) auth.getPrincipal();
        return chatService.sendMessage(userId, request.getConversationId(), request.getContent());
    }

    // Inner DTOs for request validation
    @Data
    public static class SendMessageBody {
        @jakarta.validation.constraints.NotBlank(message = "消息内容不能为空")
        @jakarta.validation.constraints.Size(max = 2000, message = "消息内容不能超过2000字")
        private String content;
    }

    @Data
    public static class MarkAsReadBody {
        @NotNull(message = "消息ID不能为空")
        private Long messageId;
    }
}
