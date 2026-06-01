package com.trektrace.service;

import com.trektrace.entity.User;
import com.trektrace.repository.ActivityRepository;
import com.trektrace.repository.FriendshipRepository;
import com.trektrace.repository.UserRepository;
import com.trektrace.repository.VerificationCodeRepository;
import com.trektrace.util.JwtUtil;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock private UserRepository userRepository;
    @Mock private VerificationCodeRepository verificationCodeRepository;
    @Mock private JwtUtil jwtUtil;
    @Mock private TokenBlacklistService tokenBlacklistService;
    @Mock private FriendshipRepository friendshipRepository;
    @Mock private ActivityRepository activityRepository;

    private UserService userService;

    @BeforeEach
    void setUp() {
        userService = new UserService(userRepository, verificationCodeRepository, jwtUtil, tokenBlacklistService, friendshipRepository, activityRepository);
    }

    @Test
    void registerUser_existingPhone_throws() {
        User existing = new User();
        existing.setPhone("13800138000");
        when(userRepository.findByIdentifier("13800138000")).thenReturn(Optional.of(existing));

        assertThrows(ResponseStatusException.class,
                () -> userService.registerUser("13800138000", "Test123"));
    }

    @Test
    void registerUser_newPhone_createsAndReturns() {
        when(userRepository.findByIdentifier("13900139000")).thenReturn(Optional.empty());

        when(userRepository.save(any(User.class))).thenAnswer(inv -> {
            User u = inv.getArgument(0);
            u.setId(1L);
            return u;
        });

        User result = userService.registerUser("13900139000", "Test123");

        assertNotNull(result);
        assertEquals("13900139000", result.getPhone());
        assertNotNull(result.getNickname());
        verify(userRepository, times(2)).save(any());
    }

    @Test
    void registerUser_existingEmail_throws() {
        User existing = new User();
        existing.setEmail("test@example.com");
        when(userRepository.findByIdentifier("test@example.com")).thenReturn(Optional.of(existing));

        assertThrows(ResponseStatusException.class,
                () -> userService.registerUser("test@example.com", "Test123"));
    }

    @Test
    void registerUser_newEmail_createsAndReturns() {
        when(userRepository.findByIdentifier("new@example.com")).thenReturn(Optional.empty());

        when(userRepository.save(any(User.class))).thenAnswer(inv -> {
            User u = inv.getArgument(0);
            u.setId(2L);
            return u;
        });

        User result = userService.registerUser("new@example.com", "Test123");

        assertNotNull(result);
        assertEquals("new@example.com", result.getEmail());
        assertTrue(result.getEmailVerified());
        assertNotNull(result.getNickname());
        verify(userRepository, times(2)).save(any());
    }

    @Test
    void getUserById_notFound_throws() {
        when(userRepository.findById(999L)).thenReturn(Optional.empty());

        assertThrows(ResponseStatusException.class, () -> userService.getUserById(999L));
    }

    @Test
    void authenticatePassword_wrongPassword_throws() {
        User user = new User();
        user.setPhone("13800138000");
        user.setPassword("$2a$10$dummyhash");
        when(userRepository.findByIdentifier("13800138000")).thenReturn(Optional.of(user));

        assertThrows(ResponseStatusException.class,
                () -> userService.authenticatePassword("13800138000", "wrongpass"));
    }

    @Test
    void updateProfile_nicknameTooLong_throws() {
        User user = new User();
        user.setId(1L);
        user.setNicknameUpdatedAt(null);
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));

        String longNickname = "一二三四五六七八"; // 8 Chinese chars = width 16 > 14
        assertThrows(ResponseStatusException.class,
                () -> userService.updateProfile(1L, longNickname, null, null, null, null, null));
    }

    @Test
    void updateProfile_validNickname_updates() {
        User user = new User();
        user.setId(1L);
        user.setNicknameUpdatedAt(null);
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        User result = userService.updateProfile(1L, "新昵称", null, null, null, null, null);

        assertEquals("新昵称", result.getNickname());
        assertNotNull(result.getNicknameUpdatedAt());
    }

    @Test
    void changePhone_duplicatePhone_throws() {
        User user = new User();
        user.setId(1L);
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(userRepository.existsByPhone("13900139000")).thenReturn(true);

        assertThrows(ResponseStatusException.class,
                () -> userService.changePhone(1L, "13900139000"));
    }
}
