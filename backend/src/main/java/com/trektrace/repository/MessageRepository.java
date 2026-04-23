package com.trektrace.repository;

import com.trektrace.entity.Message;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface MessageRepository extends JpaRepository<Message, Long> {

    Page<Message> findByConversationIdOrderByIdDesc(Long conversationId, Pageable pageable);

    Optional<Message> findTopByConversationIdOrderByIdDesc(Long conversationId);

    long countByConversationIdAndIdGreaterThan(Long conversationId, Long afterId);

    List<Message> findByIdGreaterThanOrderByIdAsc(Long afterId);

    List<Message> findAllByOrderByIdAsc();

    void deleteByConversationId(Long conversationId);

    List<Message> findByMediaUrlIn(List<String> mediaUrls);

    @Modifying
    @Query("UPDATE Message m SET m.mediaUrl = NULL, m.mediaType = NULL, m.mediaSize = NULL WHERE m.mediaUrl IN :urls")
    void clearMediaByMediaUrlIn(@Param("urls") List<String> urls);

    /**
     * 高效增量同步：直接按会话 ID 列表过滤，避免全表加载
     */
    @Query("SELECT m FROM Message m WHERE m.conversationId IN :convIds AND (:after IS NULL OR m.id > :after) ORDER BY m.id ASC")
    List<Message> findByConversationIdsAndAfter(@Param("convIds") Collection<Long> convIds, @Param("after") Long after, Pageable pageable);

    List<Message> findByConversationIdAndContentContainingIgnoreCaseOrderByCreatedAtDesc(Long conversationId, String keyword, Pageable pageable);

    List<Message> findByConversationIdInAndContentContainingIgnoreCaseOrderByCreatedAtDesc(Collection<Long> conversationIds, String keyword, Pageable pageable);

    @Query("SELECT m.mediaUrl FROM Message m WHERE m.conversationId IN :convIds AND m.mediaUrl IS NOT NULL")
    List<String> findMediaUrlsByConversationIdIn(@Param("convIds") Collection<Long> convIds);
}
