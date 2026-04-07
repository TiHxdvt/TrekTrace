package com.trektrace.repository;

import com.trektrace.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

public interface UserRepository extends JpaRepository<User, Long> {
    User findByPhone(String phone);
    Optional<User> findById(Long id);
    boolean existsByPhone(String phone);
}
