package com.trektrace.repository;

import com.trektrace.entity.Activity;
import com.trektrace.entity.Activity.ActivityType;
import com.trektrace.entity.Activity.ActivityStatus;
import com.trektrace.dto.DataSummaryResponse;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

@Repository
public interface ActivityRepository extends JpaRepository<Activity, Long> {

    List<Activity> findByUserIdOrderByStartTimeDesc(Long userId);

    List<Activity> findByUserIdAndType(Long userId, ActivityType type);

    List<Activity> findByStatus(ActivityStatus status);

    @Query("SELECT a FROM Activity a WHERE a.user.id = :userId AND a.type = :type")
    List<Activity> findByUserIdAndTypeCustom(@Param("userId") Long userId, @Param("type") ActivityType type);

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
}
