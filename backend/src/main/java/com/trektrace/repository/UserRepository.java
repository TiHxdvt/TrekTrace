package com.trektrace.repository;

import com.trektrace.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByPhone(String phone);
    boolean existsByPhone(String phone);
    Optional<User> findByAccount(Long account);

    @Modifying
    @Query("UPDATE User u SET u.account = 100000 + u.id WHERE u.account IS NULL")
    int fixNullAccounts();
}
