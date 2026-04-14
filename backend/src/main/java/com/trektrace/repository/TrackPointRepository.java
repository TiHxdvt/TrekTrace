package com.trektrace.repository;

import com.trektrace.entity.TrackPoint;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

public interface TrackPointRepository extends JpaRepository<TrackPoint, Long> {
    List<TrackPoint> findByActivityIdOrderByTimestampAsc(Long activityId);

    @Modifying
    @Query("DELETE FROM TrackPoint tp WHERE tp.activityId = :activityId")
    void deleteByActivityId(@Param("activityId") Long activityId);
}
