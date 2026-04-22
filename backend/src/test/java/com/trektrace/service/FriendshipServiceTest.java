package com.trektrace.service;

import com.trektrace.dto.FriendDTO;
import com.trektrace.dto.FriendRequestDTO;
import com.trektrace.entity.Friendship;
import com.trektrace.entity.User;
import com.trektrace.repository.FriendshipRepository;
import com.trektrace.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class FriendshipServiceTest {

    @Mock private FriendshipRepository friendshipRepository;
    @Mock private UserRepository userRepository;
    @Mock private NotificationService notificationService;
    @Mock private WebSocketService webSocketService;

    private FriendshipService friendshipService;

    @BeforeEach
    void setUp() {
        friendshipService = new FriendshipService(friendshipRepository, userRepository,
                notificationService, webSocketService);
    }

    private User makeUser(Long id, String phone, String nickname) {
        User u = new User();
        u.setId(id);
        u.setPhone(phone);
        u.setNickname(nickname);
        u.setAccount(1000L + id);
        return u;
    }

    // ---- sendRequest ----

    @Test
    void sendRequest_success() {
        User requester = makeUser(1L, "13800000001", "Alice");
        User target = makeUser(2L, "13800000002", "Bob");

        when(userRepository.findByPhone("13800000002")).thenReturn(Optional.of(target));
        when(friendshipRepository.findBlockBetweenUsers(1L, 2L)).thenReturn(Collections.emptyList());
        when(friendshipRepository.findByRequesterIdAndAddresseeId(1L, 2L)).thenReturn(Optional.empty());
        when(friendshipRepository.findByRequesterIdAndAddresseeId(2L, 1L)).thenReturn(Optional.empty());
        when(friendshipRepository.save(any(Friendship.class))).thenAnswer(inv -> {
            Friendship f = inv.getArgument(0);
            f.setId(100L);
            return f;
        });
        when(userRepository.findById(1L)).thenReturn(Optional.of(requester));

        assertDoesNotThrow(() -> friendshipService.sendRequest(1L, "13800000002"));
        verify(friendshipRepository).save(any(Friendship.class));
    }

    @Test
    void sendRequest_self_throws() {
        User self = makeUser(1L, "13800000001", "Alice");
        when(userRepository.findByPhone("13800000001")).thenReturn(Optional.of(self));

        assertThrows(ResponseStatusException.class,
                () -> friendshipService.sendRequest(1L, "13800000001"));
    }

    @Test
    void sendRequest_userNotFound_throws() {
        when(userRepository.findByPhone("13800000999")).thenReturn(Optional.empty());

        assertThrows(ResponseStatusException.class,
                () -> friendshipService.sendRequest(1L, "13800000999"));
    }

    @Test
    void sendRequest_existingFriendship_throws() {
        User target = makeUser(2L, "13800000002", "Bob");
        Friendship existing = new Friendship();
        existing.setStatus(Friendship.FriendshipStatus.ACCEPTED);

        when(userRepository.findByPhone("13800000002")).thenReturn(Optional.of(target));
        when(friendshipRepository.findBlockBetweenUsers(1L, 2L)).thenReturn(Collections.emptyList());
        when(friendshipRepository.findByRequesterIdAndAddresseeId(1L, 2L)).thenReturn(Optional.of(existing));

        assertThrows(ResponseStatusException.class,
                () -> friendshipService.sendRequest(1L, "13800000002"));
    }

    // ---- acceptRequest ----

    @Test
    void acceptRequest_success() {
        Friendship f = new Friendship();
        f.setId(100L);
        f.setRequesterId(1L);
        f.setAddresseeId(2L);
        f.setStatus(Friendship.FriendshipStatus.PENDING);
        f.setExpiresAt(LocalDateTime.now().plusDays(1));

        when(friendshipRepository.findById(100L)).thenReturn(Optional.of(f));
        when(userRepository.findById(2L)).thenReturn(Optional.of(makeUser(2L, "13800000002", "Bob")));

        friendshipService.acceptRequest(100L, 2L);

        assertEquals(Friendship.FriendshipStatus.ACCEPTED, f.getStatus());
        verify(friendshipRepository).save(f);
    }

    @Test
    void acceptRequest_wrongUser_throws() {
        Friendship f = new Friendship();
        f.setId(100L);
        f.setRequesterId(1L);
        f.setAddresseeId(2L);

        when(friendshipRepository.findById(100L)).thenReturn(Optional.of(f));

        assertThrows(ResponseStatusException.class,
                () -> friendshipService.acceptRequest(100L, 3L));
    }

    @Test
    void acceptRequest_expired_throws() {
        Friendship f = new Friendship();
        f.setId(100L);
        f.setRequesterId(1L);
        f.setAddresseeId(2L);
        f.setExpiresAt(LocalDateTime.now().minusDays(1));

        when(friendshipRepository.findById(100L)).thenReturn(Optional.of(f));

        assertThrows(ResponseStatusException.class,
                () -> friendshipService.acceptRequest(100L, 2L));
    }

    // ---- declineRequest ----

    @Test
    void declineRequest_success() {
        Friendship f = new Friendship();
        f.setId(100L);
        f.setRequesterId(1L);
        f.setAddresseeId(2L);
        f.setStatus(Friendship.FriendshipStatus.PENDING);

        when(friendshipRepository.findById(100L)).thenReturn(Optional.of(f));

        friendshipService.declineRequest(100L, 2L);

        assertEquals(Friendship.FriendshipStatus.DECLINED, f.getStatus());
        verify(friendshipRepository).save(f);
    }

    @Test
    void declineRequest_wrongUser_throws() {
        Friendship f = new Friendship();
        f.setId(100L);
        f.setRequesterId(1L);
        f.setAddresseeId(2L);

        when(friendshipRepository.findById(100L)).thenReturn(Optional.of(f));

        assertThrows(ResponseStatusException.class,
                () -> friendshipService.declineRequest(100L, 3L));
    }

    // ---- deleteFriend ----

    @Test
    void deleteFriend_success() {
        Friendship f = new Friendship();
        f.setId(100L);
        f.setRequesterId(1L);
        f.setAddresseeId(2L);

        when(friendshipRepository.findById(100L)).thenReturn(Optional.of(f));

        friendshipService.deleteFriend(100L, 1L);

        verify(friendshipRepository).delete(f);
    }

    @Test
    void deleteFriend_notParticipant_throws() {
        Friendship f = new Friendship();
        f.setId(100L);
        f.setRequesterId(1L);
        f.setAddresseeId(2L);

        when(friendshipRepository.findById(100L)).thenReturn(Optional.of(f));

        assertThrows(ResponseStatusException.class,
                () -> friendshipService.deleteFriend(100L, 3L));
    }

    // ---- getFriends ----

    @Test
    void getFriends_returnsList() {
        User user1 = makeUser(1L, "13800000001", "Alice");
        User user2 = makeUser(2L, "13800000002", "Bob");

        Friendship f = new Friendship();
        f.setId(100L);
        f.setRequesterId(1L);
        f.setAddresseeId(2L);
        f.setRequester(user1);
        f.setAddressee(user2);

        when(friendshipRepository.findAcceptedFriends(1L)).thenReturn(List.of(f));

        List<FriendDTO> friends = friendshipService.getFriends(1L);

        assertEquals(1, friends.size());
        assertEquals(2L, friends.get(0).getUserId());
        assertEquals("Bob", friends.get(0).getNickname());
    }

    @Test
    void getFriends_empty_returnsEmptyList() {
        when(friendshipRepository.findAcceptedFriends(1L)).thenReturn(Collections.emptyList());

        List<FriendDTO> friends = friendshipService.getFriends(1L);
        assertTrue(friends.isEmpty());
    }
}
