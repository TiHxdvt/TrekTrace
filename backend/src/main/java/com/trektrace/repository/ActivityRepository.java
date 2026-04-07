package com.trektrace.repository;

import com.trektrace.entity.Activity;
import com.trektrace.entity.Activity.ActivityType;
import com.trektrace.entity.Activity.ActivityStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ActivityRepository extends JpaRepository<Activity, Long> {
    
    List<Activity> findByUserIdOrderByStartTimeDesc(Long userId);
    
    List<Activity> findByUserIdAndType(Long userId, ActivityType type);
    
    List<Activity> findByStatus(ActivityStatus status);
    
    @Query("SELECT a FROM Activity a WHERE a.user.id = :userId AND a.type = :type")
    List<Activity> findByUserIdAndTypeCustom(@Param("userId") Long userId, @Param("type") ActivityType type);
}
