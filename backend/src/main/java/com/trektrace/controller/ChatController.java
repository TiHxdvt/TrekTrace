package com.trektrace.controller;

import com.trektrace.dto.ChatMessageDTO;
import com.trektrace.dto.ConversationDTO;
import com.trektrace.dto.CreateGroupRequest;
import com.trektrace.dto.SendMessageRequest;
import com.trektrace.dto.TypingEventDTO;
import com.trektrace.service.ChatService;
import com.trektrace.service.WebSocketService;
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
import java.security.Principal;
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

    private static final long MAX_MEDIA_SIZE = 5 * 1024 * 1024; // 5MB (must match spring.servlet.multipart.max-file-size)

    private final ChatService chatService;
    private final WebSocketService webSocketService;

    @Value("${app.upload.dir:/app/uploads}")
    private String uploadDir;

    public ChatController(ChatService chatService, WebSocketService webSocketService) {
        this.chatService = chatService;
        this.webSocketService = webSocketService;
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
                body.getLatitude(), body.getLongitude(), body.getDuration()));
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
            // 路径遍历防护：确保目标路径仍在 chat 目录下
            if (!targetPath.normalize().startsWith(chatDir)) {
                return ResponseEntity.badRequest().body(Map.of("error", "非法文件路径"));
            }
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

    @GetMapping("/conversations/{id}/messages/search")
    public ResponseEntity<List<ChatMessageDTO>> searchMessages(
            @PathVariable Long id,
            @RequestParam String keyword,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            Authentication auth) {
        if (keyword.isBlank() || keyword.length() > 100) {
            return ResponseEntity.badRequest().build();
        }
        Long userId = (Long) auth.getPrincipal();
        return ResponseEntity.ok(chatService.searchMessages(userId, id, keyword, page, size));
    }

    @GetMapping("/messages/search")
    public ResponseEntity<List<ChatMessageDTO>> searchAllMessages(
            @RequestParam String keyword,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            Authentication auth) {
        if (keyword.isBlank() || keyword.length() > 100) {
            return ResponseEntity.badRequest().build();
        }
        Long userId = (Long) auth.getPrincipal();
        return ResponseEntity.ok(chatService.searchAllMessages(userId, keyword, page, size));
    }

    @PutMapping("/conversations/{id}/pin")
    public ResponseEntity<Void> setPinned(
            @PathVariable Long id,
            @Valid @RequestBody PinMuteBody body,
            Authentication auth) {
        Long userId = (Long) auth.getPrincipal();
        chatService.setPinned(userId, id, body.getPinned());
        return ResponseEntity.ok().build();
    }

    @PutMapping("/conversations/{id}/mute")
    public ResponseEntity<Void> setMuted(
            @PathVariable Long id,
            @Valid @RequestBody PinMuteBody body,
            Authentication auth) {
        Long userId = (Long) auth.getPrincipal();
        chatService.setMuted(userId, id, body.getMuted());
        return ResponseEntity.ok().build();
    }

    // ---- 群聊 API ----

    @PostMapping("/conversations/group")
    public ResponseEntity<ConversationDTO> createGroup(
            @Valid @RequestBody CreateGroupRequest request,
            Authentication auth) {
        Long userId = (Long) auth.getPrincipal();
        return ResponseEntity.ok(chatService.createGroupConversation(userId, request.getName(), request.getMemberIds()));
    }

    @PutMapping("/conversations/{id}/name")
    public ResponseEntity<Void> updateGroupName(
            @PathVariable Long id,
            @RequestBody Map<String, String> body,
            Authentication auth) {
        Long userId = (Long) auth.getPrincipal();
        chatService.updateGroupName(userId, id, body.get("name"));
        return ResponseEntity.ok().build();
    }

    @PostMapping("/conversations/{id}/members")
    public ResponseEntity<Void> addMembers(
            @PathVariable Long id,
            @RequestBody Map<String, List<Long>> body,
            Authentication auth) {
        Long userId = (Long) auth.getPrincipal();
        chatService.addMembers(userId, id, body.get("memberIds"));
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/conversations/{id}/members/{targetUserId}")
    public ResponseEntity<Void> removeMember(
            @PathVariable Long id,
            @PathVariable Long targetUserId,
            Authentication auth) {
        Long userId = (Long) auth.getPrincipal();
        chatService.removeMember(userId, id, targetUserId);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/conversations/{id}/members")
    public ResponseEntity<List<ConversationDTO.ParticipantDTO>> getMembers(
            @PathVariable Long id,
            Authentication auth) {
        Long userId = (Long) auth.getPrincipal();
        return ResponseEntity.ok(chatService.getMembers(userId, id));
    }

    @MessageMapping("/chat.send")
    public ChatMessageDTO handleStompMessage(@Payload SendMessageRequest request, Principal principal) {
        Long userId = Long.valueOf(principal.getName());
        return chatService.sendMessage(userId, request.getConversationId(), request.getContent(),
                null, null, null, null, null, null);
    }

    @MessageMapping("/chat.typing")
    public void handleTypingEvent(@Payload TypingEventDTO event, Principal principal) {
        Long userId = Long.valueOf(principal.getName());
        event.setUserId(userId);
        webSocketService.sendToConversationExclude(
                event.getConversationId(), userId,
                "/queue/typing", event
        );
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
        private Integer duration;
    }

    @Data
    public static class MarkAsReadBody {
        @NotNull(message = "消息ID不能为空")
        private Long messageId;
    }

    @Data
    public static class PinMuteBody {
        private Boolean pinned;
        private Boolean muted;
    }
}
