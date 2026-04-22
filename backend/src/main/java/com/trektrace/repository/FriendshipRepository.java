package com.trektrace.repository;

import com.trektrace.entity.Friendship;
import com.trektrace.entity.Friendship.FriendshipStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface FriendshipRepository extends JpaRepository<Friendship, Long> {

    @Query("SELECT f FROM Friendship f WHERE " +
           "(f.requesterId = :userId OR f.addresseeId = :userId) AND f.status = 'ACCEPTED'")
    List<Friendship> findAcceptedFriends(@Param("userId") Long userId);

    @Query("SELECT f FROM Friendship f WHERE f.addresseeId = :userId AND f.status = 'PENDING' " +
           "AND (f.expiresAt IS NULL OR f.expiresAt > :now)")
    List<Friendship> findPendingRequests(@Param("userId") Long userId, @Param("now") LocalDateTime now);

    @Query("SELECT f FROM Friendship f WHERE " +
           "(f.requesterId = :userId OR f.addresseeId = :userId) AND f.status = 'BLOCKED'")
    List<Friendship> findBlockedByUser(@Param("userId") Long userId);

    @Query("SELECT f FROM Friendship f WHERE " +
           "((f.requesterId = :userId1 AND f.addresseeId = :userId2) OR " +
           "(f.requesterId = :userId2 AND f.addresseeId = :userId1)) AND f.status = 'BLOCKED'")
    List<Friendship> findBlockBetweenUsers(@Param("userId1") Long userId1, @Param("userId2") Long userId2);

    Optional<Friendship> findByRequesterIdAndAddresseeId(Long requesterId, Long addresseeId);

    boolean existsByRequesterIdAndAddresseeIdAndStatus(Long requesterId, Long addresseeId, FriendshipStatus status);

    @Modifying
    @Query("UPDATE Friendship f SET f.status = 'DECLINED' WHERE f.status = 'PENDING' AND f.expiresAt < :now")
    int expirePendingRequests(@Param("now") LocalDateTime now);
}
