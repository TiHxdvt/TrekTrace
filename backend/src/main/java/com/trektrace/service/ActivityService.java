package com.trektrace.service;

import com.trektrace.dto.ActivityResponse;
import com.trektrace.dto.ActivityUploadRequest;
import com.trektrace.dto.TrackPointDTO;
import com.trektrace.entity.Activity;
import com.trektrace.entity.TrackPoint;
import com.trektrace.repository.ActivityRepository;
import com.trektrace.repository.TrackPointRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class ActivityService {

    private static final DateTimeFormatter ISO_FORMATTER = DateTimeFormatter.ISO_DATE_TIME;

    private final ActivityRepository activityRepository;
    private final TrackPointRepository trackPointRepository;

    public ActivityService(ActivityRepository activityRepository,
                           TrackPointRepository trackPointRepository) {
        this.activityRepository = activityRepository;
        this.trackPointRepository = trackPointRepository;
    }

    @Transactional
    public ActivityResponse uploadActivity(ActivityUploadRequest request, Long userId) {
        Activity activity = new Activity();
        activity.setUserId(userId);
        activity.setType(Activity.ActivityType.valueOf(request.getType()));
        activity.setStartTime(parseDateTime(request.getStartTime()));
        activity.setEndTime(parseDateTime(request.getEndTime()));
        activity.setDuration(request.getDuration());
        activity.setDistance(request.getDistance() != null
                ? BigDecimal.valueOf(request.getDistance()) : BigDecimal.ZERO);
        activity.setElevationGain(request.getElevationGain() != null
                ? BigDecimal.valueOf(request.getElevationGain()) : BigDecimal.ZERO);
        activity.setStatus(Activity.ActivityStatus.COMPLETED);
        activity.setCreatedAt(LocalDateTime.now());

        activity = activityRepository.save(activity);

        if (request.getTrackPoints() != null && !request.getTrackPoints().isEmpty()) {
            Long activityId = activity.getId();
            List<TrackPoint> points = request.getTrackPoints().stream().map(dto -> {
                TrackPoint tp = new TrackPoint();
                tp.setActivityId(activityId);
                tp.setLatitude(BigDecimal.valueOf(dto.getLatitude()));
                tp.setLongitude(BigDecimal.valueOf(dto.getLongitude()));
                if (dto.getAltitude() != null) {
                    tp.setAltitude(BigDecimal.valueOf(dto.getAltitude()));
                }
                if (dto.getSpeed() != null) {
                    tp.setSpeed(BigDecimal.valueOf(dto.getSpeed()));
                }
                tp.setTimestamp(parseDateTime(dto.getTimestamp()));
                return tp;
            }).collect(Collectors.toList());
            trackPointRepository.saveAll(points);
        }

        return toResponse(activity);
    }

    public List<ActivityResponse> getUserActivities(Long userId) {
        return activityRepository.findByUserIdOrderByStartTimeDesc(userId).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    public ActivityResponse getActivity(Long id, Long userId) {
        Activity activity = activityRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "活动不存在"));
        if (!activity.getUserId().equals(userId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "无权访问");
        }
        return toResponse(activity);
    }

    public List<TrackPointDTO> getTrackPoints(Long activityId, Long userId) {
        Activity activity = activityRepository.findById(activityId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "活动不存在"));
        if (!activity.getUserId().equals(userId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "无权访问");
        }
        return trackPointRepository.findByActivityIdOrderByTimestampAsc(activityId).stream()
                .map(this::toTrackPointDTO)
                .collect(Collectors.toList());
    }

    @Transactional
    public void deleteActivity(Long id, Long userId) {
        Activity activity = activityRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "活动不存在"));
        if (!activity.getUserId().equals(userId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "无权访问");
        }
        activityRepository.delete(activity);
    }

    private ActivityResponse toResponse(Activity a) {
        ActivityResponse r = new ActivityResponse();
        r.setId(a.getId());
        r.setType(a.getType().name());
        r.setStartTime(a.getStartTime() != null ? a.getStartTime().toString() : null);
        r.setEndTime(a.getEndTime() != null ? a.getEndTime().toString() : null);
        r.setDuration(a.getDuration());
        r.setDistance(a.getDistance() != null ? a.getDistance().doubleValue() : null);
        r.setElevationGain(a.getElevationGain() != null ? a.getElevationGain().doubleValue() : null);
        r.setStatus(a.getStatus().name());
        r.setCreatedAt(a.getCreatedAt() != null ? a.getCreatedAt().toString() : null);
        return r;
    }

    private TrackPointDTO toTrackPointDTO(TrackPoint tp) {
        TrackPointDTO dto = new TrackPointDTO();
        dto.setLatitude(tp.getLatitude().doubleValue());
        dto.setLongitude(tp.getLongitude().doubleValue());
        dto.setAltitude(tp.getAltitude() != null ? tp.getAltitude().doubleValue() : null);
        dto.setSpeed(tp.getSpeed() != null ? tp.getSpeed().doubleValue() : null);
        dto.setTimestamp(tp.getTimestamp().toString());
        return dto;
    }

    private LocalDateTime parseDateTime(String value) {
        if (value == null || value.isEmpty()) return null;
        try {
            return LocalDateTime.parse(value, ISO_FORMATTER);
        } catch (DateTimeParseException e) {
            return null;
        }
    }
}
