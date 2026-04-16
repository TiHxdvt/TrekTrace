package com.trektrace.repository;

import com.trektrace.entity.Conversation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ConversationRepository extends JpaRepository<Conversation, Long> {

    @Query("SELECT c FROM Conversation c " +
           "WHERE c.type = 'DIRECT' AND c.id IN (" +
           "  SELECT cp1.conversationId FROM ConversationParticipant cp1 " +
           "  WHERE cp1.userId = :userId1 " +
           ") AND c.id IN (" +
           "  SELECT cp2.conversationId FROM ConversationParticipant cp2 " +
           "  WHERE cp2.userId = :userId2 " +
           ")")
    Optional<Conversation> findDirectConversation(@Param("userId1") Long userId1, @Param("userId2") Long userId2);

    @Query("SELECT c FROM Conversation c " +
           "WHERE c.id IN (" +
           "  SELECT cp.conversationId FROM ConversationParticipant cp " +
           "  WHERE cp.userId = :userId " +
           ") ORDER BY c.updatedAt DESC")
    List<Conversation> findByUserId(@Param("userId") Long userId);
}
