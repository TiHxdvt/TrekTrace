package com.trektrace.controller;

import com.trektrace.dto.ActivityResponse;
import com.trektrace.dto.ActivityUploadRequest;
import com.trektrace.dto.CreateActivityRequest;
import com.trektrace.dto.FriendActivityFeedDTO;
import com.trektrace.dto.TrackPointDTO;
import com.trektrace.dto.UpdateActivityRequest;
import com.trektrace.entity.Activity;
import com.trektrace.service.ActivityService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/activities")
public class ActivityController {

    private final ActivityService activityService;

    public ActivityController(ActivityService activityService) {
        this.activityService = activityService;
    }

    private Long getUserId(Authentication auth) {
        return (Long) auth.getPrincipal();
    }

    @PostMapping
    public ResponseEntity<ActivityResponse> uploadActivity(
            @Valid @RequestBody ActivityUploadRequest request,
            Authentication auth) {
        ActivityResponse response = activityService.uploadActivity(request, getUserId(auth));
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping
    public ResponseEntity<List<ActivityResponse>> getUserActivities(Authentication auth) {
        return ResponseEntity.ok(activityService.getUserActivities(getUserId(auth)));
    }

    @GetMapping("/paged")
    public ResponseEntity<Page<ActivityResponse>> getUserActivitiesPaged(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate,
            Authentication auth) {
        Activity.ActivityType activityType = type != null ? Activity.ActivityType.valueOf(type) : null;
        LocalDateTime start = startDate != null ? OffsetDateTime.parse(startDate).toLocalDateTime() : null;
        LocalDateTime end = endDate != null ? OffsetDateTime.parse(endDate).toLocalDateTime() : null;
        return ResponseEntity.ok(activityService.getUserActivitiesFiltered(
                getUserId(auth), page, size, activityType, start, end));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ActivityResponse> getActivity(@PathVariable Long id, Authentication auth) {
        return ResponseEntity.ok(activityService.getActivity(id, getUserId(auth)));
    }

    @GetMapping("/{id}/track-points")
    public ResponseEntity<List<TrackPointDTO>> getTrackPoints(
            @PathVariable Long id, Authentication auth) {
        return ResponseEntity.ok(activityService.getTrackPoints(id, getUserId(auth)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteActivity(@PathVariable Long id, Authentication auth) {
        activityService.deleteActivity(id, getUserId(auth));
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/batch")
    public ResponseEntity<Void> batchDeleteActivities(
            @RequestBody List<Long> ids, Authentication auth) {
        activityService.deleteActivities(ids, getUserId(auth));
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/active-dates")
    public ResponseEntity<List<String>> getActiveDates(
            @RequestParam int year,
            @RequestParam int month,
            Authentication auth) {
        return ResponseEntity.ok(activityService.getActiveDates(getUserId(auth), year, month));
    }

    // F6: Create live activity
    @PostMapping("/live")
    public ResponseEntity<ActivityResponse> createLiveActivity(
            @Valid @RequestBody CreateActivityRequest request,
            Authentication auth) {
        ActivityResponse response = activityService.createLiveActivity(request, getUserId(auth));
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    // F6: Sync activity (incremental update)
    @PatchMapping("/{id}/sync")
    public ResponseEntity<ActivityResponse> syncActivity(
            @PathVariable Long id,
            @Valid @RequestBody UpdateActivityRequest request,
            Authentication auth) {
        ActivityResponse response = activityService.syncActivity(id, request, getUserId(auth));
        return ResponseEntity.ok(response);
    }

    // Friend activity feed
    @GetMapping("/friend-feed")
    public ResponseEntity<Page<FriendActivityFeedDTO>> getFriendFeed(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            Authentication auth) {
        return ResponseEntity.ok(activityService.getFriendActivityFeed(getUserId(auth), page, size));
    }
}
