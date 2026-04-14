package com.trektrace.service;

import com.trektrace.entity.User;
import com.trektrace.repository.UserRepository;
import com.trektrace.util.JwtUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.Optional;

@Service
public class UserService {
    
    @Autowired
    private UserRepository userRepository;
    
    @Autowired
    private JwtUtil jwtUtil;
    
    public User createOrGetUser(String phone) {
        Optional<User> existingUser = userRepository.findByPhone(phone);
        
        if (existingUser.isPresent()) {
            return existingUser.get();
        }
        
        User newUser = new User();
        newUser.setPhone(phone);
        return userRepository.save(newUser);
    }
    
    public String generateToken(Long userId) {
        return jwtUtil.generateToken(userId);
    }

    public User getUserById(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "用户不存在"));
    }

    public User updateProfile(Long userId, String nickname, String avatarUrl) {
        User user = getUserById(userId);
        if (nickname != null) {
            user.setNickname(nickname);
        }
        if (avatarUrl != null) {
            user.setAvatarUrl(avatarUrl);
        }
        return userRepository.save(user);
    }

    public void deleteUser(Long userId) {
        userRepository.deleteById(userId);
    }

    public User changePhone(Long userId, String newPhone) {
        User user = getUserById(userId);
        if (userRepository.existsByPhone(newPhone)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "该手机号已被注册");
        }
        user.setPhone(newPhone);
        return userRepository.save(user);
    }

    public User softDeleteUser(Long userId) {
        User user = getUserById(userId);
        user.setStatus(User.UserStatus.DELETED);
        return userRepository.save(user);
    }

    public User updateVisibility(Long userId, String visibility) {
        User user = getUserById(userId);
        try {
            user.setDataVisibility(User.DataVisibility.valueOf(visibility));
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "无效的可见性设置");
        }
        return userRepository.save(user);
    }
}
