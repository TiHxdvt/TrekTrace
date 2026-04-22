package com.trektrace.entity;

import java.time.LocalDateTime;
import java.math.BigDecimal;
import java.util.List;
import java.util.ArrayList;
import jakarta.persistence.*;
import lombok.Data;

@Entity
@Table(name = "activities", indexes = {
        @Index(name = "idx_activities_user_id", columnList = "user_id"),
        @Index(name = "idx_activities_start_time", columnList = "start_time")
})
@Data
public class Activity {
    
    public enum ActivityType {
        HIKING, RUNNING, CYCLING
    }
    
    public enum ActivityStatus {
        ONGOING, PAUSED, COMPLETED
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Enumerated(EnumType.STRING)
    @Column(name = "type", nullable = false)
    private ActivityType type;

    @Column(name = "start_time")
    private LocalDateTime startTime;

    @Column(name = "end_time")
    private LocalDateTime endTime;

    @Column(name = "duration")
    private Integer duration; // seconds

    @Column(name = "distance", precision = 10, scale = 2)
    private BigDecimal distance;

    @Column(name = "elevation_gain", precision = 10, scale = 2)
    private BigDecimal elevationGain;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private ActivityStatus status;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "weather_condition")
    private String weatherCondition;

    @Column(name = "temperature", precision = 5, scale = 1)
    private BigDecimal temperature;

    @ManyToOne
    @JoinColumn(name = "user_id", insertable = false, updatable = false)
    private User user;

    @OneToMany(mappedBy = "activity", cascade = CascadeType.ALL)
    private List<TrackPoint> trackPoints = new ArrayList<>();
}
