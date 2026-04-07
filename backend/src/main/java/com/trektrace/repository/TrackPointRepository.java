package com.trektrace.repository;

import com.trektrace.entity.TrackPoint;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

public interface TrackPointRepository extends JpaRepository<TrackPoint, Long> {
    List<TrackPoint> findByActivityIdOrderByTimestampAsc(Long activityId);
}
