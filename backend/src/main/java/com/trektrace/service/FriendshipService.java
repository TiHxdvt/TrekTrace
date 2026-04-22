package com.trektrace.service;

import com.trektrace.dto.FriendDTO;
import com.trektrace.dto.FriendRequestDTO;
import com.trektrace.entity.Friendship;
import com.trektrace.entity.User;
import com.trektrace.repository.FriendshipRepository;
import com.trektrace.repository.UserRepository;
import com.trektrace.util.PhoneUtils;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class FriendshipService {

    private static final long REQUEST_EXPIRATION_DAYS = 7;

    private final FriendshipRepository friendshipRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;
    private final WebSocketService webSocketService;

    public FriendshipService(FriendshipRepository friendshipRepository,
                              UserRepository userRepository,
                              NotificationService notificationService,
                              WebSocketService webSocketService) {
        this.friendshipRepository = friendshipRepository;
        this.userRepository = userRepository;
        this.notificationService = notificationService;
        this.webSocketService = webSocketService;
    }

    public List<FriendDTO> getFriends(Long userId) {
        return friendshipRepository.findAcceptedFriends(userId).stream()
                .map(f -> {
                    User friend = f.getRequesterId().equals(userId) ? f.getAddressee() : f.getRequester();
                    FriendDTO dto = new FriendDTO();
                    dto.setFriendshipId(f.getId());
                    dto.setUserId(friend.getId());
                    dto.setAccount(friend.getAccount());
                    dto.setNickname(friend.getNickname());
                    dto.setAvatarUrl(friend.getAvatarUrl());
                    dto.setPhone(PhoneUtils.maskPhone(friend.getPhone()));
                    return dto;
                })
                .collect(Collectors.toList());
    }

    public List<FriendRequestDTO> getPendingRequests(Long userId) {
        return friendshipRepository.findPendingRequests(userId, LocalDateTime.now()).stream()
                .map(f -> new FriendRequestDTO(
                        f.getId(),
                        f.getRequesterId(),
                        f.getRequester().getNickname(),
                        f.getRequester().getAvatarUrl(),
                        f.getStatus().name(),
                        f.getCreatedAt() != null ? f.getCreatedAt().toString() : null,
                        f.getExpiresAt() != null ? f.getExpiresAt().toString() : null
                ))
                .collect(Collectors.toList());
    }

    public List<FriendDTO> getBlockedUsers(Long userId) {
        return friendshipRepository.findBlockedByUser(userId).stream()
                .map(f -> {
                    User blocked = f.getRequesterId().equals(userId) ? f.getAddressee() : f.getRequester();
                    FriendDTO dto = new FriendDTO();
                    dto.setFriendshipId(f.getId());
                    dto.setUserId(blocked.getId());
                    dto.setAccount(blocked.getAccount());
                    dto.setNickname(blocked.getNickname());
                    dto.setAvatarUrl(blocked.getAvatarUrl());
                    return dto;
                })
                .collect(Collectors.toList());
    }

    @Transactional
    public void sendRequest(Long requesterId, String targetPhone) {
        User target = userRepository.findByPhone(targetPhone)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "用户不存在"));
        sendFriendRequest(requesterId, target);
    }

    @Transactional
    public void sendRequestByAccount(Long requesterId, Long targetAccount) {
        User target = userRepository.findByAccount(targetAccount)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "用户不存在"));
        sendFriendRequest(requesterId, target);
    }

    /** Shared logic for sending a friend request — eliminates duplicate code */
    private void sendFriendRequest(Long requesterId, User target) {
        if (target.getId().equals(requesterId)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "不能添加自己为好友");
        }

        // Check bidirectional block
        if (!friendshipRepository.findBlockBetweenUsers(requesterId, target.getId()).isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "无法发送好友请求");
        }

        checkExistingFriendship(requesterId, target.getId());

        Friendship friendship = new Friendship();
        friendship.setRequesterId(requesterId);
        friendship.setAddresseeId(target.getId());
        friendship.setStatus(Friendship.FriendshipStatus.PENDING);
        friendship.setExpiresAt(LocalDateTime.now().plusDays(REQUEST_EXPIRATION_DAYS));
        try {
            friendshipRepository.save(friendship);
        } catch (DataIntegrityViolationException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "已发送过好友请求");
        }

        // Send notification
        User requester = userRepository.findById(requesterId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "用户不存在"));
        String requesterName = requester.getNickname() != null ? requester.getNickname() : "用户";

        notificationService.createNotification(
                target.getId(),
                com.trektrace.entity.Notification.NotificationType.FRIEND_REQUEST,
                "好友请求",
                requesterName + " 请求添加你为好友",
                friendship.getId()
        );

        // WebSocket push to target user
        webSocketService.sendToUser(target.getId(), "/queue/friend-requests", Map.of(
                "type", "FRIEND_REQUEST",
                "fromUserId", requesterId,
                "fromNickname", requesterName,
                "friendshipId", friendship.getId()
        ));
    }

    private void checkExistingFriendship(Long userId1, Long userId2) {
        friendshipRepository.findByRequesterIdAndAddresseeId(userId1, userId2)
                .ifPresent(f -> {
                    if (f.getStatus() == Friendship.FriendshipStatus.PENDING ||
                        f.getStatus() == Friendship.FriendshipStatus.ACCEPTED ||
                        f.getStatus() == Friendship.FriendshipStatus.BLOCKED) {
                        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "已发送过好友请求");
                    }
                    friendshipRepository.delete(f);
                });
        friendshipRepository.findByRequesterIdAndAddresseeId(userId2, userId1)
                .ifPresent(f -> {
                    if (f.getStatus() == Friendship.FriendshipStatus.PENDING ||
                        f.getStatus() == Friendship.FriendshipStatus.ACCEPTED ||
                        f.getStatus() == Friendship.FriendshipStatus.BLOCKED) {
                        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "对方已发送过好友请求");
                    }
                    friendshipRepository.delete(f);
                });
    }

    @Transactional
    public void acceptRequest(Long friendshipId, Long userId) {
        Friendship f = friendshipRepository.findById(friendshipId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "请求不存在"));
        if (!f.getAddresseeId().equals(userId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "无权操作");
        }
        if (f.getExpiresAt() != null && f.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "好友请求已过期");
        }
        f.setStatus(Friendship.FriendshipStatus.ACCEPTED);
        friendshipRepository.save(f);

        // Notify requester that their request was accepted
        User accepter = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "用户不存在"));
        webSocketService.sendToUser(f.getRequesterId(), "/queue/friend-requests", Map.of(
                "type", "FRIEND_ACCEPTED",
                "fromUserId", userId,
                "fromNickname", accepter.getNickname() != null ? accepter.getNickname() : "用户",
                "friendshipId", friendshipId
        ));
    }

    @Transactional
    public void declineRequest(Long friendshipId, Long userId) {
        Friendship f = friendshipRepository.findById(friendshipId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "请求不存在"));
        if (!f.getAddresseeId().equals(userId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "无权操作");
        }
        f.setStatus(Friendship.FriendshipStatus.DECLINED);
        friendshipRepository.save(f);
    }

    @Transactional
    public void deleteFriend(Long friendshipId, Long userId) {
        Friendship f = friendshipRepository.findById(friendshipId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "好友关系不存在"));
        if (!f.getRequesterId().equals(userId) && !f.getAddresseeId().equals(userId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "无权操作");
        }
        friendshipRepository.delete(f);
    }

    @Transactional
    public void blockUser(Long userId, Long targetId) {
        if (userId.equals(targetId)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "不能屏蔽自己");
        }

        // Find existing friendship in either direction
        friendshipRepository.findByRequesterIdAndAddresseeId(userId, targetId)
                .ifPresentOrElse(
                        f -> {
                            f.setStatus(Friendship.FriendshipStatus.BLOCKED);
                            friendshipRepository.save(f);
                        },
                        () -> {
                            friendshipRepository.findByRequesterIdAndAddresseeId(targetId, userId)
                                    .ifPresentOrElse(
                                            f -> {
                                                f.setStatus(Friendship.FriendshipStatus.BLOCKED);
                                                friendshipRepository.save(f);
                                            },
                                            () -> {
                                                Friendship block = new Friendship();
                                                block.setRequesterId(userId);
                                                block.setAddresseeId(targetId);
                                                block.setStatus(Friendship.FriendshipStatus.BLOCKED);
                                                friendshipRepository.save(block);
                                            }
                                    );
                        }
                );
    }

    @Transactional
    public void unblockUser(Long userId, Long targetId) {
        List<Friendship> blocks = friendshipRepository.findBlockBetweenUsers(userId, targetId);
        if (blocks.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "未屏蔽该用户");
        }
        friendshipRepository.deleteAll(blocks);
    }

    /** Check if two users have a block relationship (in either direction) */
    public boolean isBlocked(Long userId1, Long userId2) {
        return !friendshipRepository.findBlockBetweenUsers(userId1, userId2).isEmpty();
    }

    /** Get accepted friend user IDs for a given user */
    public List<Long> getFriendUserIds(Long userId) {
        return friendshipRepository.findAcceptedFriends(userId).stream()
                .map(f -> f.getRequesterId().equals(userId) ? f.getAddresseeId() : f.getRequesterId())
                .collect(Collectors.toList());
    }

    /** Scheduled task: expire pending friend requests every hour */
    @Scheduled(fixedRate = 3600000)
    @Transactional
    public void cleanupExpiredRequests() {
        friendshipRepository.expirePendingRequests(LocalDateTime.now());
    }
}
