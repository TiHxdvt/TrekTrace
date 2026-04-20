package com.trektrace.controller;

import com.trektrace.entity.User;
import com.trektrace.service.UserService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@RestController
@RequestMapping("/api/user")
public class AvatarController {

    private static final Set<String> ALLOWED_TYPES = Set.of(
            "image/jpeg", "image/png", "image/webp"
    );

    @Value("${app.upload.dir:/app/uploads}")
    private String uploadDir;

    private final UserService userService;

    public AvatarController(UserService userService) {
        this.userService = userService;
    }

    private Long getUserId(Authentication auth) {
        return (Long) auth.getPrincipal();
    }

    @PostMapping("/avatar")
    public ResponseEntity<?> uploadAvatar(
            @RequestParam("avatar") MultipartFile file,
            Authentication auth) {

        if (file.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "文件不能为空"));
        }

        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_TYPES.contains(contentType.toLowerCase())) {
            return ResponseEntity.badRequest().body(Map.of("error", "仅支持 JPG、PNG、WebP 格式"));
        }

        if (file.getSize() > 5 * 1024 * 1024) {
            return ResponseEntity.badRequest().body(Map.of("error", "文件大小不能超过 5MB"));
        }

        Long userId = getUserId(auth);

        Path avatarsDir = Paths.get(uploadDir, "avatars").toAbsolutePath().normalize();

        // 删除旧的自定义头像文件
        User currentUser = userService.getUserById(userId);
        String oldAvatarUrl = currentUser.getAvatarUrl();
        if (oldAvatarUrl != null && oldAvatarUrl.startsWith("/api/avatars/")) {
            String oldFilename = oldAvatarUrl.substring("/api/avatars/".length());
            Path oldPath = avatarsDir.resolve(oldFilename).normalize();
            if (oldPath.startsWith(avatarsDir)) {
                try { Files.deleteIfExists(oldPath); } catch (IOException ignored) {}
            }
        }

        String ext = switch (contentType.toLowerCase()) {
            case "image/png" -> "png";
            case "image/webp" -> "webp";
            default -> "jpg";
        };

        String filename = userId + "_" + UUID.randomUUID() + "." + ext;
        Path targetPath = avatarsDir.resolve(filename);
        try {
            Files.createDirectories(avatarsDir);
            // 路径遍历防护：确保目标路径仍在 avatars 目录下
            if (!targetPath.normalize().startsWith(avatarsDir)) {
                return ResponseEntity.badRequest().body(Map.of("error", "非法文件路径"));
            }
            file.transferTo(targetPath);
        } catch (IOException e) {
            return ResponseEntity.internalServerError().body(Map.of("error", "文件保存失败"));
        }

        String avatarUrl = "/api/avatars/" + filename;
        try {
            User updated = userService.updateProfile(userId, null, avatarUrl);
            return ResponseEntity.ok(Map.of("avatarUrl", updated.getAvatarUrl()));
        } catch (Exception e) {
            // 数据库更新失败时清理已上传的文件
            try { Files.deleteIfExists(targetPath); } catch (IOException ignored) {}
            return ResponseEntity.internalServerError().body(Map.of("error", "更新头像失败"));
        }
    }
}
