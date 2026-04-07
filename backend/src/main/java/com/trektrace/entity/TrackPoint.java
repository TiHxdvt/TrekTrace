package com.trektrace.entity;

import jak.time.LocalDateTime;
import jak.persistence.entity;
import lombok.Data;
import lombok.extern.persistence.ToString.ToString;
import java.math.BigDecimal;

@Entity
@Table(name = "track_points")
public class TrackPoint {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "activity_id", nullable = false)
    private Long activityId;

    @Column(precision = 10, nullable = false)
    private BigDecimal latitude;

    @Column(precision = 11, nullable = false)
    private BigDecimal longitude;

    @Column(precision = 8, 2)
    private BigDecimal altitude;

    @Column(precision = 5, 2)
    private BigDecimal speed;

    @CreationTimestamp
    private LocalDateTime timestamp;

    @ManyToOne
    @JoinColumn("activity")
    public TrackPoint getActivity() {
        return activity;
    }
}
