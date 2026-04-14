package com.trektrace.service;

import com.trektrace.dto.FriendDTO;
import com.trektrace.dto.FriendRequestDTO;
import com.trektrace.entity.Friendship;
import com.trektrace.entity.User;
import com.trektrace.repository.FriendshipRepository;
import com.trektrace.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class FriendshipService {

    private final FriendshipRepository friendshipRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;

    public FriendshipService(FriendshipRepository friendshipRepository,
                              UserRepository userRepository,
                              NotificationService notificationService) {
        this.friendshipRepository = friendshipRepository;
        this.userRepository = userRepository;
        this.notificationService = notificationService;
    }

    public List<FriendDTO> getFriends(Long userId) {
        return friendshipRepository.findAcceptedFriends(userId).stream()
                .map(f -> {
                    User friend = f.getRequesterId().equals(userId) ? f.getAddressee() : f.getRequester();
                    FriendDTO dto = new FriendDTO();
                    dto.setFriendshipId(f.getId());
                    dto.setUserId(friend.getId());
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

        if (target.getId().equals(requesterId)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "不能添加自己为好友");
        }

        // Check existing friendship
        friendshipRepository.findByRequesterIdAndAddresseeId(requesterId, target.getId())
                .ifPresent(f -> {
                    if (f.getStatus() == Friendship.FriendshipStatus.PENDING ||
                        f.getStatus() == Friendship.FriendshipStatus.ACCEPTED) {
                        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "已发送过好友请求");
                    }
                    // DECLINED: allow re-sending by deleting old record
                    friendshipRepository.delete(f);
                });
        friendshipRepository.findByRequesterIdAndAddresseeId(target.getId(), requesterId)
                .ifPresent(f -> {
                    if (f.getStatus() == Friendship.FriendshipStatus.PENDING ||
                        f.getStatus() == Friendship.FriendshipStatus.ACCEPTED) {
                        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "对方已发送过好友请求");
                    }
                    // DECLINED: allow re-sending by deleting old record
                    friendshipRepository.delete(f);
                });

        Friendship friendship = new Friendship();
        friendship.setRequesterId(requesterId);
        friendship.setAddresseeId(target.getId());
        friendship.setStatus(Friendship.FriendshipStatus.PENDING);
        friendshipRepository.save(friendship);

        // Send notification to target
        User requester = userRepository.findById(requesterId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "用户不存在"));
        notificationService.createNotification(
                target.getId(),
                com.trektrace.entity.Notification.NotificationType.FRIEND_REQUEST,
                "好友请求",
                (requester.getNickname() != null ? requester.getNickname() : "用户") + " 请求添加你为好友",
                friendship.getId()
        );
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

    public FriendDTO getFriendStats(Long friendUserId) {
        User friend = userRepository.findById(friendUserId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "用户不存在"));
        FriendDTO dto = new FriendDTO();
        dto.setUserId(friend.getId());
        dto.setNickname(friend.getNickname());
        dto.setAvatarUrl(friend.getAvatarUrl());
        return dto;
    }

    private String maskPhone(String phone) {
        if (phone != null && phone.length() >= 7) {
            return phone.substring(0, 3) + "****" + phone.substring(phone.length() - 4);
        }
        return phone;
    }
}
