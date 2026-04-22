package com.trektrace.service;

import com.trektrace.dto.ChatMessageDTO;
import com.trektrace.dto.ConversationDTO;
import com.trektrace.entity.*;
import com.trektrace.repository.ConversationParticipantRepository;
import com.trektrace.repository.ConversationRepository;
import com.trektrace.repository.MessageRepository;
import com.trektrace.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ChatServiceTest {

    @Mock private ConversationRepository conversationRepository;
    @Mock private ConversationParticipantRepository participantRepository;
    @Mock private MessageRepository messageRepository;
    @Mock private UserRepository userRepository;
    @Mock private WebSocketService webSocketService;

    private ChatService chatService;

    @BeforeEach
    void setUp() {
        chatService = new ChatService(conversationRepository, participantRepository,
                messageRepository, userRepository, webSocketService);
    }

    // ---- getOrCreateDirectConversation ----

    @Test
    void getOrCreateDirectConversation_existing_returnsIt() {
        Conversation existing = new Conversation();
        existing.setId(1L);
        existing.setType(Conversation.ConversationType.DIRECT);
        when(conversationRepository.findDirectConversation(1L, 2L)).thenReturn(Optional.of(existing));

        Conversation result = chatService.getOrCreateDirectConversation(1L, 2L);
        assertEquals(1L, result.getId());
        verify(conversationRepository, never()).save(any());
    }

    @Test
    void getOrCreateDirectConversation_new_createsIt() {
        when(conversationRepository.findDirectConversation(1L, 2L)).thenReturn(Optional.empty());
        when(conversationRepository.save(any(Conversation.class))).thenAnswer(inv -> {
            Conversation c = inv.getArgument(0);
            c.setId(10L);
            return c;
        });
        when(participantRepository.save(any(ConversationParticipant.class))).thenAnswer(inv -> inv.getArgument(0));

        Conversation result = chatService.getOrCreateDirectConversation(1L, 2L);
        assertNotNull(result);
        verify(participantRepository, times(2)).save(any());
    }

    // ---- sendMessage ----

    @Test
    void sendMessage_success() {
        Conversation conv = new Conversation();
        conv.setId(1L);
        conv.setType(Conversation.ConversationType.DIRECT);
        when(conversationRepository.findById(1L)).thenReturn(Optional.of(conv));
        when(participantRepository.findByConversationIdAndUserId(1L, 100L))
                .thenReturn(Optional.of(new ConversationParticipant()));
        when(messageRepository.save(any(Message.class))).thenAnswer(inv -> {
            Message m = inv.getArgument(0);
            m.setId(1L);
            m.setCreatedAt(LocalDateTime.now());
            return m;
        });
        when(conversationRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(participantRepository.findByConversationId(1L)).thenReturn(Collections.emptyList());

        ChatMessageDTO result = chatService.sendMessage(100L, 1L, "hello", null, null, null, null, null, null);

        assertNotNull(result);
        assertEquals("hello", result.getContent());
        verify(messageRepository).save(any(Message.class));
    }

    @Test
    void sendMessage_notParticipant_throws() {
        Conversation conv = new Conversation();
        conv.setId(1L);
        when(conversationRepository.findById(1L)).thenReturn(Optional.of(conv));
        when(participantRepository.findByConversationIdAndUserId(1L, 999L))
                .thenReturn(Optional.empty());

        assertThrows(ResponseStatusException.class,
                () -> chatService.sendMessage(999L, 1L, "hello", null, null, null, null, null, null));
    }

    @Test
    void sendMessage_conversationNotFound_throws() {
        when(conversationRepository.findById(999L)).thenReturn(Optional.empty());

        assertThrows(ResponseStatusException.class,
                () -> chatService.sendMessage(1L, 999L, "hello", null, null, null, null, null, null));
    }

    // ---- recallMessage ----

    @Test
    void recallMessage_success() {
        Message msg = new Message();
        msg.setId(1L);
        msg.setSenderId(100L);
        msg.setContent("hello");
        msg.setType(Message.MessageType.TEXT);
        msg.setConversationId(1L);
        msg.setCreatedAt(LocalDateTime.now());

        when(messageRepository.findById(1L)).thenReturn(Optional.of(msg));
        when(messageRepository.save(any(Message.class))).thenAnswer(inv -> inv.getArgument(0));
        when(participantRepository.findByConversationId(1L)).thenReturn(Collections.emptyList());

        ChatMessageDTO result = chatService.recallMessage(100L, 1L);

        assertEquals(Message.MessageType.RECALLED, msg.getType());
        assertEquals("", msg.getContent());
    }

    @Test
    void recallMessage_wrongUser_throws() {
        Message msg = new Message();
        msg.setId(1L);
        msg.setSenderId(100L);
        msg.setCreatedAt(LocalDateTime.now());

        when(messageRepository.findById(1L)).thenReturn(Optional.of(msg));

        assertThrows(ResponseStatusException.class,
                () -> chatService.recallMessage(200L, 1L));
    }

    @Test
    void recallMessage_tooLate_throws() {
        Message msg = new Message();
        msg.setId(1L);
        msg.setSenderId(100L);
        msg.setCreatedAt(LocalDateTime.now().minusMinutes(5));

        when(messageRepository.findById(1L)).thenReturn(Optional.of(msg));

        assertThrows(ResponseStatusException.class,
                () -> chatService.recallMessage(100L, 1L));
    }

    // ---- getConversations ----

    @Test
    void getConversations_empty_returnsEmptyList() {
        when(conversationRepository.findByUserId(1L)).thenReturn(Collections.emptyList());

        List<ConversationDTO> result = chatService.getConversations(1L);
        assertTrue(result.isEmpty());
    }

    // ---- markAsRead ----

    @Test
    void markAsRead_updatesLastReadMessageId() {
        ConversationParticipant participant = new ConversationParticipant();
        participant.setConversationId(1L);
        participant.setUserId(100L);
        participant.setLastReadMessageId(5L);

        when(participantRepository.findByConversationIdAndUserId(1L, 100L))
                .thenReturn(Optional.of(participant));
        when(participantRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        chatService.markAsRead(100L, 1L, 10L);

        assertEquals(10L, participant.getLastReadMessageId());
        verify(participantRepository).save(participant);
    }

    @Test
    void markAsRead_notParticipant_throws() {
        when(participantRepository.findByConversationIdAndUserId(1L, 999L))
                .thenReturn(Optional.empty());

        assertThrows(ResponseStatusException.class,
                () -> chatService.markAsRead(999L, 1L, 10L));
    }

    @Test
    void markAsRead_ignoresOlderMessageId() {
        ConversationParticipant participant = new ConversationParticipant();
        participant.setLastReadMessageId(15L);

        when(participantRepository.findByConversationIdAndUserId(1L, 100L))
                .thenReturn(Optional.of(participant));

        chatService.markAsRead(100L, 1L, 10L);

        // Should not downgrade
        assertEquals(15L, participant.getLastReadMessageId());
        verify(participantRepository, never()).save(any());
    }
}
