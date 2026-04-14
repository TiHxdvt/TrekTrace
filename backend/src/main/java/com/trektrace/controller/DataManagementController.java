package com.trektrace.controller;

import com.trektrace.dto.DataSummaryResponse;
import com.trektrace.service.ActivityService;
import com.trektrace.service.UserService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/data")
public class DataManagementController {

    private final ActivityService activityService;
    private final UserService userService;

    public DataManagementController(ActivityService activityService, UserService userService) {
        this.activityService = activityService;
        this.userService = userService;
    }

    private Long getUserId(Authentication auth) {
        return (Long) auth.getPrincipal();
    }

    @GetMapping("/summary")
    public ResponseEntity<DataSummaryResponse> getSummary(Authentication auth) {
        return ResponseEntity.ok(activityService.getDataSummary(getUserId(auth)));
    }

    @GetMapping("/export")
    public ResponseEntity<?> exportData(
            @RequestParam(defaultValue = "json") String format,
            Authentication auth) {
        return ResponseEntity.ok(activityService.exportData(getUserId(auth), format));
    }

    @DeleteMapping("/activities")
    public ResponseEntity<Void> deleteAllActivities(Authentication auth) {
        activityService.deleteAllByUserId(getUserId(auth));
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/account")
    public ResponseEntity<Void> deleteAccount(Authentication auth) {
        Long userId = getUserId(auth);
        activityService.deleteAllActivitiesAndUser(userId);
        return ResponseEntity.noContent().build();
    }
}
