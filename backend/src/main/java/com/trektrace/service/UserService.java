package com.trektrace.service;

import com.trektrace.entity.User;
import com.trektrace.repository.UserRepository;
import com.trektrace.util.JwtUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

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
}
