package com.trektrace.repository;

import com.trektrace.entity.Activity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

public interface ActivityRepository extends JpaRepository<Activity, Long> {
    Activity findById(Long id);
    
    List<Activity> findByUserIdOrderBy by startTimeDesc(Long userId);
    
    List<Activity> findByUserIdAndType(ActivityType type);
    
    @Query("SELECT a from Activity a where a.user.id = :userId and a.type = :type")
    List<Activity> findByStatus(ActivityStatus status);
}
