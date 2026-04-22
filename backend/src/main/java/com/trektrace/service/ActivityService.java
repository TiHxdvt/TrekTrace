package com.trektrace.service;

import com.trektrace.dto.*;
import com.trektrace.entity.Activity;
import com.trektrace.entity.Friendship;
import com.trektrace.entity.TrackPoint;
import com.trektrace.entity.User;
import com.trektrace.repository.ActivityRepository;
import com.trektrace.repository.FriendshipRepository;
import com.trektrace.repository.TrackPointRepository;
import com.trektrace.repository.UserRepository;
import com.trektrace.validation.TrackDataValidator;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.io.OutputStream;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.*;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@Service
public class ActivityService {

    private static final DateTimeFormatter ISO_FORMATTER = DateTimeFormatter.ISO_DATE_TIME;

    private final ActivityRepository activityRepository;
    private final TrackPointRepository trackPointRepository;
    private final UserRepository userRepository;
    private final FriendshipRepository friendshipRepository;
    private final TrackDataValidator trackDataValidator;
    private final ObjectMapper objectMapper;

    public ActivityService(ActivityRepository activityRepository,
                           TrackPointRepository trackPointRepository,
                           UserRepository userRepository,
                           FriendshipRepository friendshipRepository,
                           TrackDataValidator trackDataValidator,
                           ObjectMapper objectMapper) {
        this.activityRepository = activityRepository;
        this.trackPointRepository = trackPointRepository;
        this.userRepository = userRepository;
        this.friendshipRepository = friendshipRepository;
        this.trackDataValidator = trackDataValidator;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public ActivityResponse uploadActivity(ActivityUploadRequest request, Long userId) {
        // F5: Validate track data
        if (request.getTrackPoints() != null && !request.getTrackPoints().isEmpty()) {
            TrackValidationResult validation = trackDataValidator.validate(
                    request.getTrackPoints(), request.getStartTime(), request.getEndTime(),
                    request.getDuration(), request.getDistance());
            if (!validation.isValid()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "轨迹数据无效: " + String.join("; ", validation.getErrors()));
            }
        }

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
        activity.setWeatherCondition(request.getWeatherCondition());
        if (request.getTemperature() != null) {
            activity.setTemperature(BigDecimal.valueOf(request.getTemperature()));
        }

        activity = activityRepository.save(activity);

        List<TrackPoint> savedPoints = Collections.emptyList();
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
            savedPoints = trackPointRepository.saveAll(points);
        }

        // Update user's last known location from the last track point
        if (!savedPoints.isEmpty()) {
            TrackPoint lastPoint = savedPoints.get(savedPoints.size() - 1);
            userRepository.findById(userId).ifPresent(user -> {
                user.setLastLatitude(lastPoint.getLatitude());
                user.setLastLongitude(lastPoint.getLongitude());
                user.setLastLocationAt(LocalDateTime.now());
                userRepository.save(user);
            });
        }

        return toResponse(activity);
    }

    public List<ActivityResponse> getUserActivities(Long userId) {
        return activityRepository.findByUserIdOrderByStartTimeDesc(userId).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    public Page<ActivityResponse> getUserActivities(Long userId, Pageable pageable) {
        return activityRepository.findByUserIdOrderByStartTimeDesc(userId, pageable)
                .map(this::toResponse);
    }

    public Page<ActivityResponse> getUserActivitiesFiltered(
            Long userId, int page, int size,
            Activity.ActivityType type,
            LocalDateTime startDate, LocalDateTime endDate) {
        return activityRepository.findByUserIdFiltered(
                userId, type, startDate, endDate,
                PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "startTime"))
        ).map(this::toResponse);
    }

    @Transactional
    public void deleteActivities(List<Long> ids, Long userId) {
        for (Long id : ids) {
            Activity activity = activityRepository.findById(id)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "活动不存在: " + id));
            if (!activity.getUserId().equals(userId)) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "无权删除活动: " + id);
            }
            trackPointRepository.deleteByActivityId(id);
            activityRepository.delete(activity);
        }
    }

    public List<String> getActiveDates(Long userId, int year, int month) {
        return activityRepository.findActiveDatesByMonth(userId, year, month).stream()
                .map(LocalDate::toString)
                .collect(Collectors.toList());
    }

    public ActivityResponse getActivity(Long id, Long userId) {
        Activity activity = activityRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "活动不存在"));
        if (!activity.getUserId().equals(userId)) {
            checkActivityVisibility(activity, userId);
        }
        return toResponse(activity);
    }

    public List<TrackPointDTO> getTrackPoints(Long activityId, Long userId) {
        Activity activity = activityRepository.findById(activityId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "活动不存在"));
        if (!activity.getUserId().equals(userId)) {
            checkActivityVisibility(activity, userId);
        }
        return trackPointRepository.findByActivityIdOrderByTimestampAsc(activityId).stream()
                .map(this::toTrackPointDTO)
                .collect(Collectors.toList());
    }

    /** Check if a non-owner user can access an activity based on visibility settings */
    private void checkActivityVisibility(Activity activity, Long viewerId) {
        User owner = userRepository.findById(activity.getUserId()).orElse(null);
        if (owner == null) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "无权访问");
        }
        switch (owner.getDataVisibility()) {
            case PUBLIC:
                return;
            case FRIENDS:
                boolean isFriend = friendshipRepository.findAcceptedFriends(viewerId).stream()
                        .anyMatch(f -> f.getRequesterId().equals(activity.getUserId()) ||
                                       f.getAddresseeId().equals(activity.getUserId()));
                if (!isFriend) {
                    throw new ResponseStatusException(HttpStatus.FORBIDDEN, "无权访问");
                }
                return;
            case PRIVATE:
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "无权访问");
        }
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
        r.setWeatherCondition(a.getWeatherCondition());
        r.setTemperature(a.getTemperature() != null ? a.getTemperature().doubleValue() : null);
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

    public DataSummaryResponse getDataSummary(Long userId) {
        DataSummaryResponse summary = new DataSummaryResponse();
        summary.setTotalActivities(activityRepository.countByUserId(userId));
        BigDecimal dist = activityRepository.sumDistanceByUserId(userId);
        summary.setTotalDistance(dist != null ? dist.doubleValue() : 0.0);
        summary.setTotalDuration(activityRepository.sumDurationByUserId(userId));
        BigDecimal elev = activityRepository.sumElevationGainByUserId(userId);
        summary.setTotalElevationGain(elev != null ? elev.doubleValue() : 0.0);
        return summary;
    }

    public List<Map<String, Object>> exportData(Long userId, String format) {
        List<Activity> activities = activityRepository.findByUserIdOrderByStartTimeDesc(userId);
        return activities.stream().map(this::toExportMap).collect(Collectors.toList());
    }

    public void exportDataStreaming(Long userId, String format, OutputStream outputStream) {
        try {
            int page = 0;
            int size = 100;
            boolean first = true;
            outputStream.write("[".getBytes(StandardCharsets.UTF_8));

            while (true) {
                Page<Activity> activities = activityRepository.findByUserIdOrderByStartTimeDesc(
                        userId, PageRequest.of(page, size));
                if (activities.isEmpty()) break;

                for (Activity a : activities.getContent()) {
                    if (!first) outputStream.write(",".getBytes(StandardCharsets.UTF_8));
                    first = false;
                    String json = objectMapper.writeValueAsString(toExportMap(a));
                    outputStream.write(json.getBytes(StandardCharsets.UTF_8));
                }

                if (!activities.hasNext()) break;
                page++;
            }

            outputStream.write("]".getBytes(StandardCharsets.UTF_8));
        } catch (Exception e) {
            throw new RuntimeException("导出数据失败", e);
        }
    }

    private Map<String, Object> toExportMap(Activity a) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", a.getId());
        map.put("type", a.getType().name());
        map.put("startTime", a.getStartTime() != null ? a.getStartTime().toString() : null);
        map.put("endTime", a.getEndTime() != null ? a.getEndTime().toString() : null);
        map.put("duration", a.getDuration());
        map.put("distance", a.getDistance() != null ? a.getDistance().doubleValue() : null);
        map.put("elevationGain", a.getElevationGain() != null ? a.getElevationGain().doubleValue() : null);
        map.put("status", a.getStatus().name());
        return map;
    }

    @Transactional
    public void deleteAllByUserId(Long userId) {
        List<Activity> activities = activityRepository.findByUserIdOrderByStartTimeDesc(userId);
        for (Activity a : activities) {
            trackPointRepository.deleteByActivityId(a.getId());
        }
        activityRepository.deleteByUserId(userId);
    }

    // F6: Create live activity (ONGOING status)
    @Transactional
    public ActivityResponse createLiveActivity(CreateActivityRequest request, Long userId) {
        Activity activity = new Activity();
        activity.setUserId(userId);
        activity.setType(Activity.ActivityType.valueOf(request.getType()));
        activity.setStartTime(parseDateTime(request.getStartTime()));
        activity.setStatus(Activity.ActivityStatus.ONGOING);
        activity.setDistance(BigDecimal.ZERO);
        activity.setElevationGain(BigDecimal.ZERO);
        activity.setCreatedAt(LocalDateTime.now());

        activity = activityRepository.save(activity);
        return toResponse(activity);
    }

    // F6: Sync activity (incremental update)
    @Transactional
    public ActivityResponse syncActivity(Long activityId, UpdateActivityRequest request, Long userId) {
        Activity activity = activityRepository.findById(activityId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "活动不存在"));
        if (!activity.getUserId().equals(userId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "无权访问");
        }

        // Validate status transition
        if (request.getStatus() != null) {
            Activity.ActivityStatus newStatus = Activity.ActivityStatus.valueOf(request.getStatus());
            validateStatusTransition(activity.getStatus(), newStatus);
            activity.setStatus(newStatus);
        }

        if (request.getEndTime() != null) {
            activity.setEndTime(parseDateTime(request.getEndTime()));
        }
        if (request.getDuration() != null) {
            activity.setDuration(request.getDuration());
        }
        if (request.getDistance() != null) {
            activity.setDistance(BigDecimal.valueOf(request.getDistance()));
        }
        if (request.getElevationGain() != null) {
            activity.setElevationGain(BigDecimal.valueOf(request.getElevationGain()));
        }

        activity.setUpdatedAt(LocalDateTime.now());
        activity = activityRepository.save(activity);

        // Append new track points (deduplicate by timestamp)
        if (request.getNewTrackPoints() != null && !request.getNewTrackPoints().isEmpty()) {
            List<TrackPoint> existingPoints = trackPointRepository
                    .findByActivityIdOrderByTimestampAsc(activityId);
            LocalDateTime latestExisting = existingPoints.isEmpty() ? null
                    : existingPoints.get(existingPoints.size() - 1).getTimestamp();

            List<TrackPoint> newPoints = request.getNewTrackPoints().stream()
                    .filter(dto -> {
                        if (latestExisting == null) return true;
                        LocalDateTime ts = parseDateTime(dto.getTimestamp());
                        return ts != null && ts.isAfter(latestExisting);
                    })
                    .map(dto -> {
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
                    })
                    .collect(Collectors.toList());

            if (!newPoints.isEmpty()) {
                trackPointRepository.saveAll(newPoints);
            }
        }

        return toResponse(activity);
    }

    private void validateStatusTransition(Activity.ActivityStatus current, Activity.ActivityStatus target) {
        boolean valid = switch (current) {
            case ONGOING -> target == Activity.ActivityStatus.PAUSED || target == Activity.ActivityStatus.COMPLETED;
            case PAUSED -> target == Activity.ActivityStatus.ONGOING || target == Activity.ActivityStatus.COMPLETED;
            case COMPLETED -> false; // No transitions from COMPLETED
        };
        if (!valid) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "不允许从 " + current + " 转换到 " + target);
        }
    }

    @Transactional
    public void deleteAllActivitiesAndUser(Long userId) {
        deleteAllByUserId(userId);
        User user = userRepository.findById(userId).orElse(null);
        if (user != null) {
            user.setStatus(User.UserStatus.DELETED);
            userRepository.save(user);
        }
    }

    /** Friend activity feed: get recent activities from friends */
    public Page<FriendActivityFeedDTO> getFriendActivityFeed(Long userId, int page, int size) {
        // Get friend IDs
        List<Long> friendIds = friendshipRepository.findAcceptedFriends(userId).stream()
                .map(f -> f.getRequesterId().equals(userId) ? f.getAddresseeId() : f.getRequesterId())
                .collect(Collectors.toList());

        if (friendIds.isEmpty()) {
            return Page.empty(PageRequest.of(page, size));
        }

        // Filter out blocked users
        List<Long> blockedIds = friendshipRepository.findBlockedByUser(userId).stream()
                .flatMap(f -> Stream.of(f.getRequesterId(), f.getAddresseeId()))
                .filter(id -> !id.equals(userId))
                .collect(Collectors.toList());
        friendIds.removeAll(blockedIds);

        if (friendIds.isEmpty()) {
            return Page.empty(PageRequest.of(page, size));
        }

        // Query recent 30 days of activities
        LocalDateTime since = LocalDateTime.now().minusDays(30);
        Page<Activity> activities = activityRepository.findRecentByUserIds(
                friendIds, since, PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "startTime")));

        // Load user info for the activities
        Set<Long> userIds = activities.getContent().stream()
                .map(Activity::getUserId)
                .collect(Collectors.toSet());
        Map<Long, User> userMap = userRepository.findAllById(userIds).stream()
                .collect(Collectors.toMap(User::getId, u -> u));

        // Filter by visibility and map to DTO
        List<FriendActivityFeedDTO> dtos = activities.getContent().stream()
                .map(a -> {
                    User owner = userMap.get(a.getUserId());
                    if (owner == null || owner.getDataVisibility() == User.DataVisibility.PRIVATE) {
                        return null;
                    }
                    FriendActivityFeedDTO dto = new FriendActivityFeedDTO();
                    dto.setActivityId(a.getId());
                    dto.setUserId(owner.getId());
                    dto.setNickname(owner.getNickname());
                    dto.setAvatarUrl(owner.getAvatarUrl());
                    dto.setActivityType(a.getType().name());
                    dto.setDistance(a.getDistance() != null ? a.getDistance().doubleValue() : null);
                    dto.setDuration(a.getDuration());
                    dto.setStartTime(a.getStartTime() != null ? a.getStartTime().toString() : null);
                    return dto;
                })
                .filter(Objects::nonNull)
                .collect(Collectors.toList());

        return new org.springframework.data.domain.PageImpl<>(dtos, activities.getPageable(), activities.getTotalElements());
    }
}
