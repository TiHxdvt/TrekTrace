package com.trektrace.controller;

import com.trektrace.dto.ChatMessageDTO;
import com.trektrace.dto.ConversationDTO;
import com.trektrace.dto.SendMessageRequest;
import com.trektrace.service.ChatService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@RestController
@RequestMapping("/api/chat")
public class ChatController {

    private static final Set<String> ALLOWED_MEDIA_TYPES = Set.of(
            "image/jpeg", "image/png", "image/webp",
            "audio/aac", "audio/mp4", "audio/mpeg", "audio/wav", "audio/x-m4a"
    );

    private static final long MAX_MEDIA_SIZE = 20 * 1024 * 1024; // 20MB

    private final ChatService chatService;

    @Value("${app.upload.dir:/app/uploads}")
    private String uploadDir;

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
        // 条件验证：无 mediaType 和经纬度时，content 不能为空
        if (body.getMediaType() == null && body.getLatitude() == null && body.getLongitude() == null) {
            if (body.getContent() == null || body.getContent().isBlank()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "消息内容不能为空");
            }
            if (body.getContent().length() > 2000) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "消息内容不能超过2000字符");
            }
        }
        Long userId = (Long) auth.getPrincipal();
        return ResponseEntity.ok(chatService.sendMessage(userId, id, body.getContent(),
                body.getMediaType(), body.getMediaUrl(), body.getMediaSize(),
                body.getLatitude(), body.getLongitude()));
    }

    @PostMapping("/upload")
    public ResponseEntity<?> uploadMedia(
            @RequestParam("file") MultipartFile file,
            Authentication auth) {

        if (file.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "文件不能为空"));
        }

        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_MEDIA_TYPES.contains(contentType.toLowerCase())) {
            return ResponseEntity.badRequest().body(Map.of("error", "不支持的文件类型"));
        }

        if (file.getSize() > MAX_MEDIA_SIZE) {
            return ResponseEntity.badRequest().body(Map.of("error", "文件大小不能超过 20MB"));
        }

        Long userId = (Long) auth.getPrincipal();

        String ext = guessExtension(contentType);
        String filename = userId + "_" + UUID.randomUUID() + "." + ext;

        Path chatDir = Paths.get(uploadDir, "chat").toAbsolutePath().normalize();
        Path targetPath = chatDir.resolve(filename);

        try {
            Files.createDirectories(chatDir);
            file.transferTo(targetPath);
        } catch (IOException e) {
            return ResponseEntity.internalServerError().body(Map.of("error", "文件保存失败"));
        }

        String mediaUrl = "/api/chat/media/" + filename;
        String mediaType = contentType.startsWith("image/") ? "IMAGE" : "AUDIO";

        return ResponseEntity.ok(Map.of("url", mediaUrl, "mediaType", mediaType));
    }

    @PutMapping("/messages/{id}/recall")
    public ResponseEntity<ChatMessageDTO> recallMessage(
            @PathVariable Long id,
            Authentication auth) {
        Long userId = (Long) auth.getPrincipal();
        return ResponseEntity.ok(chatService.recallMessage(userId, id));
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

    @GetMapping("/messages/sync")
    public ResponseEntity<List<ChatMessageDTO>> syncMessages(
            @RequestParam(required = false) Long after,
            Authentication auth) {
        Long userId = (Long) auth.getPrincipal();
        return ResponseEntity.ok(chatService.syncMessages(userId, after));
    }

    @DeleteMapping("/conversations/{id}")
    public ResponseEntity<Void> deleteConversation(
            @PathVariable Long id,
            Authentication auth) {
        Long userId = (Long) auth.getPrincipal();
        chatService.deleteConversation(userId, id);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/messages/{id}")
    public ResponseEntity<Void> deleteMessage(
            @PathVariable Long id,
            Authentication auth) {
        Long userId = (Long) auth.getPrincipal();
        chatService.deleteMessage(userId, id);
        return ResponseEntity.ok().build();
    }

    @MessageMapping("/chat.send")
    public ChatMessageDTO handleStompMessage(@Payload SendMessageRequest request, Authentication auth) {
        Long userId = (Long) auth.getPrincipal();
        return chatService.sendMessage(userId, request.getConversationId(), request.getContent(),
                null, null, null, null, null);
    }

    private String guessExtension(String contentType) {
        return switch (contentType.toLowerCase()) {
            case "image/png" -> "png";
            case "image/webp" -> "webp";
            case "audio/aac" -> "aac";
            case "audio/mp4" -> "m4a";
            case "audio/mpeg" -> "mp3";
            case "audio/wav" -> "wav";
            case "audio/x-m4a" -> "m4a";
            default -> "jpg";
        };
    }

    // Inner DTOs for request validation
    @Data
    public static class SendMessageBody {
        private String content;
        private String mediaType;
        private String mediaUrl;
        private Long mediaSize;
        private Double latitude;
        private Double longitude;
    }

    @Data
    public static class MarkAsReadBody {
        @NotNull(message = "消息ID不能为空")
        private Long messageId;
    }
}
