package com.trektrace.entity;

import java.time.LocalDateTime;
import java.math.BigDecimal;
import jakarta.persistence.*;
import lombok.Data;

@Entity
@Table(name = "track_points")
@Data
public class TrackPoint {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "activity_id", nullable = false)
    private Long activityId;

    @Column(precision = 10, scale = 8, nullable = false)
    private BigDecimal latitude;

    @Column(precision = 11, scale = 8, nullable = false)
    private BigDecimal longitude;

    @Column(precision = 8, scale = 2)
    private BigDecimal altitude;

    @Column(precision = 5, scale = 2)
    private BigDecimal speed;

    @Column(name = "timestamp", nullable = false)
    private LocalDateTime timestamp;

    @ManyToOne
    @JoinColumn(name = "activity_id", insertable = false, updatable = false)
    private Activity activity;
}
