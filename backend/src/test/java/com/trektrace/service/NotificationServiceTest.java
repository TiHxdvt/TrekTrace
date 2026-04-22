package com.trektrace.service;

import com.trektrace.dto.NotificationDTO;
import com.trektrace.entity.Notification;
import com.trektrace.repository.NotificationRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class NotificationServiceTest {

    @Mock private NotificationRepository notificationRepository;
    @Mock private WebSocketService webSocketService;

    private NotificationService notificationService;

    @BeforeEach
    void setUp() {
        notificationService = new NotificationService(notificationRepository, webSocketService);
    }

    // ---- getUserNotifications ----

    @Test
    void getUserNotifications_returnsList() {
        Notification n = new Notification();
        n.setId(1L);
        n.setUserId(100L);
        n.setType(Notification.NotificationType.FRIEND_REQUEST);
        n.setTitle("好友请求");
        n.setContent("Alice 请求添加你为好友");
        n.setIsRead(false);
        n.setCreatedAt(LocalDateTime.now());

        when(notificationRepository.findByUserIdOrderByCreatedAtDesc(100L)).thenReturn(List.of(n));

        List<NotificationDTO> result = notificationService.getUserNotifications(100L);

        assertEquals(1, result.size());
        assertEquals("FRIEND_REQUEST", result.get(0).getType());
        assertEquals("好友请求", result.get(0).getTitle());
    }

    @Test
    void getUserNotifications_empty_returnsEmptyList() {
        when(notificationRepository.findByUserIdOrderByCreatedAtDesc(100L)).thenReturn(List.of());

        List<NotificationDTO> result = notificationService.getUserNotifications(100L);
        assertTrue(result.isEmpty());
    }

    // ---- getUnreadCount ----

    @Test
    void getUnreadCount_returnsCount() {
        when(notificationRepository.countByUserIdAndIsReadFalse(100L)).thenReturn(5L);

        long count = notificationService.getUnreadCount(100L);
        assertEquals(5L, count);
    }

    @Test
    void getUnreadCount_noUnread_returnsZero() {
        when(notificationRepository.countByUserIdAndIsReadFalse(100L)).thenReturn(0L);

        long count = notificationService.getUnreadCount(100L);
        assertEquals(0L, count);
    }

    // ---- markAsRead ----

    @Test
    void markAsRead_success() {
        Notification n = new Notification();
        n.setId(1L);
        n.setUserId(100L);
        n.setIsRead(false);

        when(notificationRepository.findById(1L)).thenReturn(Optional.of(n));
        when(notificationRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        notificationService.markAsRead(1L, 100L);

        assertTrue(n.getIsRead());
        verify(notificationRepository).save(n);
    }

    @Test
    void markAsRead_notFound_throws() {
        when(notificationRepository.findById(999L)).thenReturn(Optional.empty());

        assertThrows(ResponseStatusException.class,
                () -> notificationService.markAsRead(999L, 100L));
    }

    @Test
    void markAsRead_wrongUser_throws() {
        Notification n = new Notification();
        n.setId(1L);
        n.setUserId(100L);

        when(notificationRepository.findById(1L)).thenReturn(Optional.of(n));

        assertThrows(ResponseStatusException.class,
                () -> notificationService.markAsRead(1L, 200L));
    }

    // ---- markAllAsRead ----

    @Test
    void markAllAsRead_delegatesToRepo() {
        notificationService.markAllAsRead(100L);
        verify(notificationRepository).markAllAsReadByUserId(100L);
    }

    // ---- createNotification ----

    @Test
    void createNotification_savesAndReturns() {
        when(notificationRepository.save(any(Notification.class))).thenAnswer(inv -> {
            Notification n = inv.getArgument(0);
            n.setId(1L);
            return n;
        });

        Notification result = notificationService.createNotification(
                100L,
                Notification.NotificationType.FRIEND_REQUEST,
                "好友请求",
                "Alice 请求添加你为好友",
                50L
        );

        assertNotNull(result);
        assertEquals(100L, result.getUserId());
        assertEquals(Notification.NotificationType.FRIEND_REQUEST, result.getType());
        assertEquals("好友请求", result.getTitle());
        assertEquals("Alice 请求添加你为好友", result.getContent());
        assertEquals(50L, result.getRelatedId());
        verify(notificationRepository).save(any(Notification.class));
    }

    @Test
    void createNotification_milestoneType() {
        when(notificationRepository.save(any(Notification.class))).thenAnswer(inv -> inv.getArgument(0));

        Notification result = notificationService.createNotification(
                100L,
                Notification.NotificationType.MILESTONE,
                "里程碑",
                "你已完成100次徒步",
                null
        );

        assertEquals(Notification.NotificationType.MILESTONE, result.getType());
    }
}
