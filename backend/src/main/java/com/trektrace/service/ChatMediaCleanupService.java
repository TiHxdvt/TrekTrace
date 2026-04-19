package com.trektrace.service;

import com.trektrace.repository.MessageRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.nio.file.*;
import java.nio.file.attribute.BasicFileAttributes;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;

@Slf4j
@Service
public class ChatMediaCleanupService {

    @Value("${app.upload.dir:/app/uploads}")
    private String uploadDir;

    private static final long MAX_AGE_DAYS = 7;

    private final MessageRepository messageRepository;

    public ChatMediaCleanupService(MessageRepository messageRepository) {
        this.messageRepository = messageRepository;
    }

    @Scheduled(cron = "0 0 3 * * ?")
    @Transactional
    public void cleanupExpiredMedia() {
        log.info("[ChatMediaCleanup] Starting cleanup of files older than {} days", MAX_AGE_DAYS);

        Path chatDir = Paths.get(uploadDir, "chat").toAbsolutePath().normalize();
        if (!Files.exists(chatDir)) {
            log.info("[ChatMediaCleanup] Chat directory does not exist, skipping");
            return;
        }

        Instant cutoff = LocalDateTime.now().minusDays(MAX_AGE_DAYS).atZone(ZoneId.systemDefault()).toInstant();
        List<String> deletedUrls = new ArrayList<>();

        try {
            Files.walkFileTree(chatDir, new SimpleFileVisitor<>() {
                @Override
                public FileVisitResult visitFile(Path file, BasicFileAttributes attrs) throws IOException {
                    if (attrs.lastModifiedTime().toInstant().isBefore(cutoff)) {
                        String filename = file.getFileName().toString();
                        String mediaUrl = "/api/chat/media/" + filename;
                        Files.delete(file);
                        deletedUrls.add(mediaUrl);
                        log.debug("[ChatMediaCleanup] Deleted file: {}", filename);
                    }
                    return FileVisitResult.CONTINUE;
                }

                @Override
                public FileVisitResult visitFileFailed(Path file, IOException exc) {
                    log.warn("[ChatMediaCleanup] Failed to visit file: {}", file, exc);
                    return FileVisitResult.CONTINUE;
                }
            });
        } catch (IOException e) {
            log.error("[ChatMediaCleanup] Error walking chat directory", e);
            return;
        }

        // 清理 DB 中指向已删文件的 media_url
        if (!deletedUrls.isEmpty()) {
            try {
                messageRepository.clearMediaByMediaUrlIn(deletedUrls);
            } catch (Exception e) {
                log.error("[ChatMediaCleanup] Error clearing media references in DB", e);
            }
        }

        log.info("[ChatMediaCleanup] Cleanup complete. Deleted {} files", deletedUrls.size());
    }
}
