package com.trektrace.repository;

import com.trektrace.entity.Message;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface MessageRepository extends JpaRepository<Message, Long> {

    Page<Message> findByConversationIdOrderByIdDesc(Long conversationId, Pageable pageable);

    Optional<Message> findTopByConversationIdOrderByIdDesc(Long conversationId);

    long countByConversationIdAndIdGreaterThan(Long conversationId, Long afterId);
}
