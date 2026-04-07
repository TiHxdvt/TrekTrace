package com.trektrace.entity;

import java.time.LocalDateTime;
import java.math.BigDecimal;
import java.util.List;
import java.util.ArrayList;
import jak.persistence.*;
import lombok.Data;

@Entity
@Table(name = "activities")
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

    @ManyToOne
    @JoinColumn(name = "user_id", insertable = false, updatable = false)
    private User user;

    @OneToMany(mappedBy = "activity", cascade = CascadeType.ALL)
    private List<TrackPoint> trackPoints = new ArrayList<>();
}
