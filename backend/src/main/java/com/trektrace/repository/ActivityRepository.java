package com.trektrace.repository;

import com.trektrace.entity.Activity;
import com.trektrace.entity.Activity.ActivityType;
import com.trektrace.entity.Activity.ActivityStatus;
import com.trektrace.dto.DataSummaryResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface ActivityRepository extends JpaRepository<Activity, Long> {

    List<Activity> findByUserIdOrderByStartTimeDesc(Long userId);

    Page<Activity> findByUserIdOrderByStartTimeDesc(Long userId, Pageable pageable);

    List<Activity> findByUserIdAndType(Long userId, ActivityType type);

    List<Activity> findByStatus(ActivityStatus status);

    @Query("SELECT a FROM Activity a WHERE a.user.id = :userId AND a.type = :type")
    List<Activity> findByUserIdAndTypeCustom(@Param("userId") Long userId, @Param("type") ActivityType type);

    @Query("SELECT a FROM Activity a WHERE a.userId = :userId " +
            "AND (:type IS NULL OR a.type = :type) " +
            "AND (:startDate IS NULL OR a.startTime >= :startDate) " +
            "AND (:endDate IS NULL OR a.startTime <= :endDate) " +
            "ORDER BY a.startTime DESC")
    Page<Activity> findByUserIdFiltered(
            @Param("userId") Long userId,
            @Param("type") ActivityType type,
            @Param("startDate") LocalDateTime startDate,
            @Param("endDate") LocalDateTime endDate,
            Pageable pageable);

    @Query("SELECT DISTINCT CAST(a.startTime AS LocalDate) FROM Activity a " +
            "WHERE a.userId = :userId " +
            "AND YEAR(a.startTime) = :year AND MONTH(a.startTime) = :month " +
            "ORDER BY CAST(a.startTime AS LocalDate)")
    List<LocalDate> findActiveDatesByMonth(
            @Param("userId") Long userId,
            @Param("year") int year,
            @Param("month") int month);

    @Query("SELECT COUNT(a) FROM Activity a WHERE a.userId = :userId")
    long countByUserId(@Param("userId") Long userId);

    @Query("SELECT COALESCE(SUM(a.distance), 0) FROM Activity a WHERE a.userId = :userId")
    BigDecimal sumDistanceByUserId(@Param("userId") Long userId);

    @Query("SELECT COALESCE(SUM(a.duration), 0) FROM Activity a WHERE a.userId = :userId")
    long sumDurationByUserId(@Param("userId") Long userId);

    @Query("SELECT COALESCE(SUM(a.elevationGain), 0) FROM Activity a WHERE a.userId = :userId")
    BigDecimal sumElevationGainByUserId(@Param("userId") Long userId);

    @Modifying
    @Transactional
    void deleteByUserId(Long userId);

    @Query("SELECT DISTINCT CAST(a.startTime AS LocalDate) FROM Activity a " +
            "WHERE a.userId = :userId AND a.status = 'COMPLETED' " +
            "ORDER BY CAST(a.startTime AS LocalDate)")
    List<LocalDate> findAllActiveDates(@Param("userId") Long userId);

    @Query("SELECT a FROM Activity a WHERE a.userId = :userId AND a.status = 'COMPLETED'")
    List<Activity> findAllCompletedByUserId(@Param("userId") Long userId);

    @Query("SELECT a FROM Activity a WHERE a.userId IN :userIds AND a.status = 'COMPLETED' " +
           "AND a.startTime >= :since ORDER BY a.startTime DESC")
    Page<Activity> findRecentByUserIds(@Param("userIds") List<Long> userIds,
                                       @Param("since") LocalDateTime since,
                                       Pageable pageable);

    @Query("SELECT a FROM Activity a WHERE a.userId IN :userIds AND a.status = 'COMPLETED' " +
           "ORDER BY a.startTime DESC")
    List<Activity> findLatestByUserIds(@Param("userIds") List<Long> userIds,
                                       Pageable pageable);

    @Query("SELECT a FROM Activity a WHERE a.userId = :userId AND a.status = 'COMPLETED' " +
           "AND a.startTime >= :start AND a.startTime < :end")
    List<Activity> findAllCompletedByUserIdAndStartTimeBetween(
            @Param("userId") Long userId,
            @Param("start") LocalDateTime start,
            @Param("end") LocalDateTime end);

    @Query("SELECT a FROM Activity a WHERE a.userId = :userId AND a.status = 'COMPLETED' AND a.type = :type ORDER BY a.distance DESC")
    List<Activity> findCompletedByUserIdAndTypeOrderByDistanceDesc(@Param("userId") Long userId, @Param("type") ActivityType type, Pageable pageable);

    @Query("SELECT a FROM Activity a WHERE a.userId = :userId AND a.status = 'COMPLETED' AND a.type = :type ORDER BY a.duration DESC")
    List<Activity> findCompletedByUserIdAndTypeOrderByDurationDesc(@Param("userId") Long userId, @Param("type") ActivityType type, Pageable pageable);

    @Query("SELECT a FROM Activity a WHERE a.userId = :userId AND a.status = 'COMPLETED' AND a.type = :type ORDER BY a.elevationGain DESC")
    List<Activity> findCompletedByUserIdAndTypeOrderByElevationDesc(@Param("userId") Long userId, @Param("type") ActivityType type, Pageable pageable);

    @Query("SELECT a FROM Activity a WHERE a.userId = :userId AND a.status = 'COMPLETED' " +
           "AND a.type IN :types AND a.distance > 0 AND a.duration > 0 ORDER BY (a.duration * 1000 / a.distance) ASC")
    List<Activity> findFastestPaceByUserIdAndTypes(@Param("userId") Long userId, @Param("types") List<ActivityType> types, Pageable pageable);

    @Query("SELECT COUNT(a) FROM Activity a WHERE a.userId = :userId AND a.status = 'COMPLETED'")
    long countCompletedByUserId(@Param("userId") Long userId);
}
