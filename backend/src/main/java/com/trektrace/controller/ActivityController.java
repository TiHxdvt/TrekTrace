package com.trektrace.controller;

import com.trektrace.dto.ActivityResponse;
import com.trektrace.dto.ActivityUploadRequest;
import com.trektrace.dto.TrackPointDTO;
import com.trektrace.service.ActivityService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

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
            @RequestBody ActivityUploadRequest request,
            Authentication auth) {
        ActivityResponse response = activityService.uploadActivity(request, getUserId(auth));
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping
    public ResponseEntity<List<ActivityResponse>> getUserActivities(Authentication auth) {
        return ResponseEntity.ok(activityService.getUserActivities(getUserId(auth)));
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
}
