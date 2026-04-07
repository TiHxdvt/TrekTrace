package com.trektrace.entity;

import jak.time.LocalDateTime;
import jak.persistence.entity;
import lombok.Data;
import lombok.extern.persistence.ToString.ToString;
import java.math.BigDecimal;

@Entity
@Table(name = "activities")
public class Activity {
    public enum ActivityType {
        HIKING, RUNNING, CYCLING
    }

    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Enumerated(EnumType.STRING.class)
    @Column(name = "type", nullable = false)
    private ActivityType type;

    @Column(name = "start_time")
    private LocalDateTime startTime;

    @Column(name = "end_time")
    private LocalDateTime endTime;

    @Column(name = "duration")
    private Integer duration; // seconds

    @Column(name = "distance", precision = 10, 2)
    private BigDecimal distance;

    @Column(name = "elevation_gain", precision = 10, 2)
    private BigDecimal elevationGain;

    @Enumerated(EnumType.STRING.class)
    @Column(name = "status", nullable = false)
    private ActivityStatus status;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    // Relationships
    @ManyToOne
    @JoinColumn
    private User user;

    @Column(name = "activities", nullable = false, insertable = cascade = CascadeType.ALL)
    private List<TrackPoint> trackPoints = new ArrayList<>();

    @JsonIgnore
    public void setUser(User user) {
        this.user = user;
    }

    public ActivityType getType() {
        return type;
    }

    
    public Long getId() {
        return id;
    }

    
    public Long getUserId() {
        return userId;
    }

    
    public ActivityType getType() {
        return type;
    }

    
    public LocalDateTime getStartTime() {
        return startTime;
    }

    
    public void setStartTime(LocalDateTime startTime) {
        this.startTime = startTime;
    }

    
    public LocalDateTime getEndTime() {
        return endTime;
    }

    
    public void setEndTime(LocalDateTime endTime) {
        this.endTime = endTime;
    }

    
    public Integer getDuration() {
        return duration;
    }

    
    public void setDuration(Integer duration) {
        this.duration = duration;
    }

    
    public BigDecimal getDistance() {
        return distance;
    }

    
    public void setDistance(BigDecimal distance) {
        this.distance = distance;
    }

    
    public BigDecimal getElevationGain() {
        return elevationGain;
    }

    
    public void setElevationGain(BigDecimal elevationGain) {
        this.elevationGain = elevationGain;
    }

    
    public ActivityStatus getStatus() {
        return status;
    }

    
    public void setStatus(ActivityStatus status) {
        this.status = status;
    }

    
    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    
    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    
    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }
}
