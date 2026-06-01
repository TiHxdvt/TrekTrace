package com.trektrace.repository;

import com.trektrace.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByPhone(String phone);
    boolean existsByPhone(String phone);
    Optional<User> findByAccount(Long account);
    Optional<User> findByEmail(String email);

    @Query("SELECT u FROM User u WHERE u.email = :identifier OR u.phone = :identifier")
    Optional<User> findByIdentifier(@Param("identifier") String identifier);

    @Modifying
    @Query("UPDATE User u SET u.account = 100000 + u.id WHERE u.account IS NULL")
    int fixNullAccounts();

    @Query("SELECT u FROM User u WHERE " +
           "u.lastLatitude BETWEEN :minLat AND :maxLat " +
           "AND u.lastLongitude BETWEEN :minLon AND :maxLon " +
           "AND u.lastLocationAt >= :recentCutoff " +
           "AND u.id <> :userId " +
           "AND u.dataVisibility IN :visibilities " +
           "AND u.status = 'ACTIVE'")
    List<User> findNearbyUsers(@Param("minLat") BigDecimal minLat,
                               @Param("maxLat") BigDecimal maxLat,
                               @Param("minLon") BigDecimal minLon,
                               @Param("maxLon") BigDecimal maxLon,
                               @Param("recentCutoff") LocalDateTime recentCutoff,
                               @Param("userId") Long userId,
                               @Param("visibilities") List<User.DataVisibility> visibilities);
}
