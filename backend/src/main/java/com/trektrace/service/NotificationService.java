package com.trektrace.service;

import com.trektrace.dto.NotificationDTO;
import com.trektrace.entity.Notification;
import com.trektrace.repository.NotificationRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final WebSocketService webSocketService;

    public NotificationService(NotificationRepository notificationRepository,
                               WebSocketService webSocketService) {
        this.notificationRepository = notificationRepository;
        this.webSocketService = webSocketService;
    }

    public List<NotificationDTO> getUserNotifications(Long userId) {
        return notificationRepository.findByUserIdOrderByCreatedAtDesc(userId).stream()
                .map(NotificationDTO::new)
                .collect(Collectors.toList());
    }

    public Page<NotificationDTO> getUserNotifications(Long userId, Pageable pageable) {
        return notificationRepository.findByUserIdOrderByCreatedAtDesc(userId, pageable)
                .map(NotificationDTO::new);
    }

    public long getUnreadCount(Long userId) {
        return notificationRepository.countByUserIdAndIsReadFalse(userId);
    }

    @Transactional
    public void markAsRead(Long notificationId, Long userId) {
        Notification n = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "通知不存在"));
        if (!n.getUserId().equals(userId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "无权操作");
        }
        n.setIsRead(true);
        notificationRepository.save(n);
    }

    @Transactional
    public void markAllAsRead(Long userId) {
        notificationRepository.markAllAsReadByUserId(userId);
    }

    public Notification createNotification(Long userId, Notification.NotificationType type,
                                            String title, String content, Long relatedId) {
        Notification n = new Notification();
        n.setUserId(userId);
        n.setType(type);
        n.setTitle(title);
        n.setContent(content);
        n.setRelatedId(relatedId);
        Notification saved = notificationRepository.save(n);

        // Push notification to user via WebSocket
        NotificationDTO dto = new NotificationDTO(saved);
        webSocketService.sendToUser(userId, "/queue/notifications", dto);

        return saved;
    }
}
