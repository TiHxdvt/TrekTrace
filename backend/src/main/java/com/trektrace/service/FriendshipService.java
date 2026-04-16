package com.trektrace.service;

import com.trektrace.dto.FriendDTO;
import com.trektrace.dto.FriendRequestDTO;
import com.trektrace.entity.Friendship;
import com.trektrace.entity.User;
import com.trektrace.repository.FriendshipRepository;
import com.trektrace.repository.UserRepository;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class FriendshipService {

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
                    dto.setPhone(maskPhone(friend.getPhone()));
                    return dto;
                })
                .collect(Collectors.toList());
    }

    public List<FriendRequestDTO> getPendingRequests(Long userId) {
        return friendshipRepository.findPendingRequests(userId).stream()
                .map(f -> new FriendRequestDTO(
                        f.getId(),
                        f.getRequesterId(),
                        f.getRequester().getNickname(),
                        f.getRequester().getAvatarUrl(),
                        f.getStatus().name(),
                        f.getCreatedAt() != null ? f.getCreatedAt().toString() : null
                ))
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

        checkExistingFriendship(requesterId, target.getId());

        Friendship friendship = new Friendship();
        friendship.setRequesterId(requesterId);
        friendship.setAddresseeId(target.getId());
        friendship.setStatus(Friendship.FriendshipStatus.PENDING);
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
                        f.getStatus() == Friendship.FriendshipStatus.ACCEPTED) {
                        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "已发送过好友请求");
                    }
                    friendshipRepository.delete(f);
                });
        friendshipRepository.findByRequesterIdAndAddresseeId(userId2, userId1)
                .ifPresent(f -> {
                    if (f.getStatus() == Friendship.FriendshipStatus.PENDING ||
                        f.getStatus() == Friendship.FriendshipStatus.ACCEPTED) {
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

    private String maskPhone(String phone) {
        if (phone != null && phone.length() >= 7) {
            return phone.substring(0, 3) + "****" + phone.substring(phone.length() - 4);
        }
        return phone;
    }
}
